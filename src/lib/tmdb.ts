const IMG_BASE = "https://image.tmdb.org/t/p";

// Edge Function URL — all TMDB calls go through the server, key never exposed to browser
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-proxy`;

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  media_type: "movie" | "tv";
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string;
  budget: number;
  revenue: number;
  credits?: {
    cast: TMDBCast[];
    crew: TMDBCrew[];
  };
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export const getPosterUrl = (path: string | null, size: "w200" | "w500" = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export const getProfileUrl = (path: string | null) =>
  path ? `${IMG_BASE}/w185${path}` : null;


import { supabase } from "@/integrations/supabase/client";

async function proxyFetch(path: string, params: Record<string, string> = {}): Promise<Response> {
  const queryParams = new URLSearchParams({ path, ...params });
  
  // We use supabase.functions.invoke to automatically hook into standard Supabase auth
  // and completely avoid exposing the keys physically in this file. Note we still manually 
  // extract the raw fetch response because TMDB searches expect full Response objects.
  const { data, error } = await supabase.functions.invoke(`tmdb-proxy?${queryParams.toString()}`, {
    method: "GET"
  });

  if (error) {
    throw new Error(`TMDB proxy failed: ${error.message}`);
  }

  // To maintain compatibility with the rest of proxyFetch callers that expect a Response
  // object out of `fetch`, we'll return a stubbed response wrapping the JSON data.
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  const res = await proxyFetch("/search/multi", { query });
  if (!res.ok) throw new Error("TMDB multi-search failed");
  const data = await res.json();
  
  // Filter for movies and TV shows, and normalize TV shows
  return (data.results ?? [])
    .filter((m: any) => m.media_type === "movie" || m.media_type === "tv")
    .map((m: any) => ({
      ...m,
      media_type: m.media_type,
      title: m.title ?? m.name,
      release_date: m.release_date ?? m.first_air_date ?? "",
    }))
    .slice(0, 10);
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export async function searchPerson(query: string): Promise<TMDBPerson[]> {
  if (!query.trim()) return [];
  const res = await proxyFetch("/search/person", { query });
  if (!res.ok) throw new Error("TMDB person search failed");
  const data = await res.json();
  return data.results?.slice(0, 5) ?? [];
}

export async function getPersonMovies(personId: number): Promise<TMDBMovie[]> {
  const res = await proxyFetch(`/person/${personId}/movie_credits`);
  if (!res.ok) throw new Error("TMDB person credits failed");
  const data = await res.json();
  // Combine cast + crew movies, deduplicate, sort by popularity
  const castMovies: TMDBMovie[] = data.cast ?? [];
  const crewMovies: TMDBMovie[] = data.crew ?? [];
  const seen = new Set<number>();
  const all: TMDBMovie[] = [];
  for (const m of [...castMovies, ...crewMovies]) {
    if (!seen.has(m.id) && m.poster_path) {
      seen.add(m.id);
      all.push(m);
    }
  }
  return all
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 20);
}

export async function getMovieDetails(tmdbId: number, mediaType: "movie" | "tv" = "movie"): Promise<TMDBMovieDetail | null> {
  const endpoint = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const res = await proxyFetch(endpoint, { append_to_response: "credits" });
  if (!res.ok) return null;
  const data = await res.json();
  
  // Normalize TV results to match the movie-focused detail shape
  if (mediaType === "tv") {
    return {
      ...data,
      title: data.name,
      release_date: data.first_air_date,
      runtime: data.episode_run_time?.[0] || null, // Take first episode runtime as a proxy
    };
  }
  return data;
}

export async function getRandomMovies(page = 1): Promise<TMDBMovie[]> {
  const params = { language: "en-US", page: page.toString() };

  const [movieRes, tvRes] = await Promise.all([
    proxyFetch("/trending/movie/day", params),
    proxyFetch("/trending/tv/day", params),
  ]);

  const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
  const tvData    = tvRes.ok    ? await tvRes.json()    : { results: [] };

  const movieResults: TMDBMovie[] = (movieData.results ?? []).map((item: any) => ({
    ...item,
    media_type: "movie" as const,
  }));

  // TV shows use `name` / `first_air_date` — normalize to TMDBMovie shape
  const tvResults: TMDBMovie[] = (tvData.results ?? []).map((item: any) => ({
    ...item,
    media_type: "tv" as const,
    title: item.title ?? item.name,
    release_date: item.release_date ?? item.first_air_date ?? "",
  }));

  const combined = [...movieResults, ...tvResults];
  
  // Shuffle to mix movies and TV shows
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined;
}
