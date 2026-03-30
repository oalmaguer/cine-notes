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


async function proxyFetch(path: string, params: Record<string, string> = {}): Promise<Response> {
  const url = new URL(PROXY_URL);
  url.searchParams.set("path", path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString());
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  const res = await proxyFetch("/search/movie", { query });
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results?.slice(0, 8) ?? [];
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetail | null> {
  const res = await proxyFetch(`/movie/${tmdbId}`, { append_to_response: "credits" });
  if (!res.ok) return null;
  return res.json();
}
