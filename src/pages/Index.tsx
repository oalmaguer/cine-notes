import { useState, useEffect, useMemo } from "react";
import { Film, Clapperboard } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MovieSearch } from "@/components/MovieSearch";
import { MovieCard } from "@/components/MovieCard";
import { ApiKeyPrompt } from "@/components/ApiKeyPrompt";
import {
  getWatchedMovies,
  addWatchedMovie,
  removeWatchedMovie,
  updateMovieRating,
  TMDBMovie,
  WatchedMovie,
} from "@/lib/tmdb";

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tmdb_api_key") || "");
  const [movies, setMovies] = useState<WatchedMovie[]>([]);

  useEffect(() => {
    setMovies(getWatchedMovies());
  }, []);

  const watchedIds = useMemo(() => new Set(movies.map((m) => m.id)), [movies]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem("tmdb_api_key", key);
    setApiKey(key);
  };

  const handleAdd = (movie: TMDBMovie, rating: number) => {
    setMovies(addWatchedMovie(movie, rating));
  };

  const handleRemove = (id: number) => {
    setMovies(removeWatchedMovie(id));
  };

  const handleRate = (id: number, rating: number) => {
    setMovies(updateMovieRating(id, rating));
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ApiKeyPrompt onSave={handleSaveKey} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-3">
          <Clapperboard className="text-primary" size={32} />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            My Movies
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {movies.length} movie{movies.length !== 1 ? "s" : ""} watched
        </p>
      </motion.header>

      {/* Search */}
      <MovieSearch onAdd={handleAdd} watchedIds={watchedIds} />

      {/* Grid */}
      {movies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 space-y-4"
        >
          <Film size={48} className="mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">No movies yet. Search and add your first one!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {movies.map((movie, i) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onRemove={handleRemove}
                onRate={handleRate}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Index;
