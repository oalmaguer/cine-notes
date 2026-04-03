import { useState, useEffect, useMemo, useCallback } from "react";
import { Film, Clapperboard, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MovieSearch } from "@/components/MovieSearch";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { LoginPage } from "@/components/LoginPage";
import { ProfilePage } from "@/components/ProfilePage";
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
  has_watched: boolean;
}

const Index = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [movies, setMovies] = useState<DBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<DBMovie | null>(null);
  const [previewTmdbMovie, setPreviewTmdbMovie] = useState<TMDBMovie | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewMode, setViewMode] = useState<"watched" | "watchlist">("watched");

  const fetchMovies = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("watched_movies")
      .select("id, tmdb_id, title, overview, poster_url, release_date, tmdb_rating, user_rating, has_watched")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMovies((data as DBMovie[]) || []);
  }, [user]);

  useEffect(() => {
    if (user) fetchMovies();
  }, [user, fetchMovies]);

  const watchedTmdbIds = useMemo(() => new Set(movies.filter(m => m.has_watched).map(m => m.tmdb_id)), [movies]);
  const watchlistTmdbIds = useMemo(() => new Set(movies.filter(m => !m.has_watched).map(m => m.tmdb_id)), [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => m.has_watched === (viewMode === "watched"));
  }, [movies, viewMode]);

  const handleAdd = async (movie: TMDBMovie, rating: number, has_watched: boolean = true) => {
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
      has_watched,
    });
    await fetchMovies();
  };

  const handleToggleWatched = async (id: string, currentlyWatched: boolean) => {
    await supabase.from("watched_movies").update({ has_watched: !currentlyWatched }).eq("id", id);
    setMovies((prev) => prev.map((m) => m.id === id ? { ...m, has_watched: !currentlyWatched } : m));
    if (selectedMovie?.id === id) setSelectedMovie((p) => p ? { ...p, has_watched: !currentlyWatched } : p);
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
              {filteredMovies.length} movie{filteredMovies.length !== 1 ? "s" : ""} {viewMode === "watched" ? "watched" : "to watch"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Profile avatar button */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(profile?.display_name || user?.email || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>
          <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </motion.header>

      <MovieSearch 
        onAdd={handleAdd} 
        watchedIds={watchedTmdbIds} 
        watchlistIds={watchlistTmdbIds} 
        onPreview={setPreviewTmdbMovie}
      />

      {/* Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-muted p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setViewMode("watched")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "watched"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Watched
          </button>
          <button
            onClick={() => setViewMode("watchlist")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "watchlist"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Want to Watch
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredMovies.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
          <Film size={48} className="mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">No movies yet in this list.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMovies.map((movie, i) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onRemove={handleRemove}
                onRate={handleRate}
                onClick={() => setSelectedMovie(movie)}
                index={i}
                onToggleWatched={() => handleToggleWatched(movie.id, movie.has_watched)}
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
          onAdd={handleAdd}
          watchedIds={watchedTmdbIds}
          watchlistIds={watchlistTmdbIds}
          onPreview={setPreviewTmdbMovie}
        />
      )}

      {/* Preview Modal for unsaved movies */}
      {previewTmdbMovie && (
        <MovieDetail
          tmdbId={previewTmdbMovie.id}
          userRating={0}
          onClose={() => setPreviewTmdbMovie(null)}
          onRate={handleRate}
          onAdd={handleAdd}
          watchedIds={watchedTmdbIds}
          watchlistIds={watchlistTmdbIds}
          onPreview={setPreviewTmdbMovie}
        />
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
