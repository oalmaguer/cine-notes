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


const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function proxyFetch(path: string, params: Record<string, string> = {}): Promise<Response> {
  const url = new URL(PROXY_URL);
  url.searchParams.set("path", path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString(), {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  const res = await proxyFetch("/search/movie", { query });
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results?.slice(0, 8) ?? [];
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

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetail | null> {
  const res = await proxyFetch(`/movie/${tmdbId}`, { append_to_response: "credits" });
  if (!res.ok) return null;
  return res.json();
}
