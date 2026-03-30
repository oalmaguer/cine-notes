const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

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

function getApiKey(): string {
  return localStorage.getItem("tmdb_api_key") || "";
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`
  );
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results?.slice(0, 8) ?? [];
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetail | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const res = await fetch(
    `${BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
  );
  if (!res.ok) return null;
  return res.json();
}
