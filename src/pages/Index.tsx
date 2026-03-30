import { useState, useEffect, useMemo, useCallback } from "react";
import { Film, Clapperboard, LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MovieSearch } from "@/components/MovieSearch";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { ApiKeyPrompt } from "@/components/ApiKeyPrompt";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TMDBMovie, getPosterUrl } from "@/lib/tmdb";

interface DBMovie {
  id: string;
  tmdb_id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
  release_date: string | null;
  tmdb_rating: number | null;
  user_rating: number;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tmdb_api_key") || "");
  const [movies, setMovies] = useState<DBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<DBMovie | null>(null);
  const [showApiSettings, setShowApiSettings] = useState(false);

  const fetchMovies = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("watched_movies")
      .select("id, tmdb_id, title, overview, poster_url, release_date, tmdb_rating, user_rating")
      .order("created_at", { ascending: false });
    setMovies((data as DBMovie[]) || []);
  }, [user]);

  useEffect(() => {
    if (user) fetchMovies();
  }, [user, fetchMovies]);

  const watchedTmdbIds = useMemo(() => new Set(movies.map((m) => m.tmdb_id)), [movies]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem("tmdb_api_key", key);
    setApiKey(key);
    setShowApiSettings(false);
  };

  const handleAdd = async (movie: TMDBMovie, rating: number) => {
    if (!user) return;
    await supabase.from("watched_movies").insert({
      user_id: user.id,
      tmdb_id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_url: getPosterUrl(movie.poster_path),
      release_date: movie.release_date,
      tmdb_rating: movie.vote_average,
      user_rating: rating,
    });
    await fetchMovies();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("watched_movies").delete().eq("id", id);
    setMovies((prev) => prev.filter((m) => m.id !== id));
    if (selectedMovie?.id === id) setSelectedMovie(null);
  };

  const handleRate = async (id: string, rating: number) => {
    await supabase.from("watched_movies").update({ user_rating: rating }).eq("id", id);
    setMovies((prev) => prev.map((m) => m.id === id ? { ...m, user_rating: rating } : m));
    if (selectedMovie?.id === id) setSelectedMovie((p) => p ? { ...p, user_rating: rating } : p);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (!apiKey || showApiSettings) {
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
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Clapperboard className="text-primary" size={32} />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">My Movies</h1>
            <p className="text-muted-foreground text-sm">
              {movies.length} movie{movies.length !== 1 ? "s" : ""} watched
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowApiSettings(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Settings size={18} />
          </button>
          <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </motion.header>

      {/* Search */}
      <MovieSearch onAdd={handleAdd} watchedIds={watchedTmdbIds} />

      {/* Grid */}
      {movies.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
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
                onClick={() => setSelectedMovie(movie)}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMovie && (
        <MovieDetail
          tmdbId={selectedMovie.tmdb_id}
          movieDbId={selectedMovie.id}
          userRating={selectedMovie.user_rating}
          onClose={() => setSelectedMovie(null)}
          onRate={handleRate}
        />
      )}
    </div>
  );
};

export default Index;
