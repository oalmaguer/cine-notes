const TMDB_API_KEY = ""; // User needs to add their TMDB API key

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

export interface WatchedMovie {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseDate: string;
  tmdbRating: number;
  userRating: number;
  addedAt: string;
}

export const getPosterUrl = (path: string | null, size: "w200" | "w500" = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];
  
  const apiKey = TMDB_API_KEY || localStorage.getItem("tmdb_api_key") || "";
  if (!apiKey) return [];

  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`
  );
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results?.slice(0, 8) ?? [];
}

export function getWatchedMovies(): WatchedMovie[] {
  try {
    return JSON.parse(localStorage.getItem("watched_movies") || "[]");
  } catch {
    return [];
  }
}

export function saveWatchedMovies(movies: WatchedMovie[]) {
  localStorage.setItem("watched_movies", JSON.stringify(movies));
}

export function addWatchedMovie(movie: TMDBMovie, rating: number): WatchedMovie[] {
  const watched = getWatchedMovies();
  if (watched.some((m) => m.id === movie.id)) return watched;
  
  const newMovie: WatchedMovie = {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterUrl: getPosterUrl(movie.poster_path),
    releaseDate: movie.release_date,
    tmdbRating: movie.vote_average,
    userRating: rating,
    addedAt: new Date().toISOString(),
  };
  
  const updated = [newMovie, ...watched];
  saveWatchedMovies(updated);
  return updated;
}

export function removeWatchedMovie(id: number): WatchedMovie[] {
  const updated = getWatchedMovies().filter((m) => m.id !== id);
  saveWatchedMovies(updated);
  return updated;
}

export function updateMovieRating(id: number, rating: number): WatchedMovie[] {
  const movies = getWatchedMovies().map((m) =>
    m.id === id ? { ...m, userRating: rating } : m
  );
  saveWatchedMovies(movies);
  return movies;
}
