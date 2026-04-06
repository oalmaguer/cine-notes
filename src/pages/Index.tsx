import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Film, Clapperboard, LogOut, Compass, Bookmark, BookmarkCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MovieSearch } from "@/components/MovieSearch";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { LoginPage } from "@/components/LoginPage";
import { ProfilePage } from "@/components/ProfilePage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TMDBMovie, getPosterUrl, getRandomMovies } from "@/lib/tmdb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const navigate = useNavigate();
  const [movies, setMovies] = useState<DBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<DBMovie | null>(null);
  const [previewTmdbMovie, setPreviewTmdbMovie] = useState<TMDBMovie | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewMode, setViewMode] = useState<"watched" | "watchlist" | "recommendations">("watched");
  const [sortBy, setSortBy] = useState<"date_added" | "release_date" | "user_rating" | "tmdb_rating">("date_added");
  const [randomMovies, setRandomMovies] = useState<TMDBMovie[]>([]);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const recPageRef = useRef(1);
  const seenMovieIds = useRef<Set<number>>(new Set());

  const loadRandomMovies = async (append = false) => {
    if (append) {
      setLoadingMore(true);
      try {
        const nextPage = recPageRef.current + 1;
        const movies = await getRandomMovies(nextPage);
        recPageRef.current = nextPage;
        const newMovies = movies.filter(m => !seenMovieIds.current.has(m.id));
        newMovies.forEach(m => seenMovieIds.current.add(m.id));
        setRandomMovies(prev => [...prev, ...newMovies]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMore(false);
      }
    } else {
      setLoadingRandom(true);
      try {
        recPageRef.current = 1;
        seenMovieIds.current = new Set();
        const movies = await getRandomMovies(1);
        movies.forEach(m => seenMovieIds.current.add(m.id));
        setRandomMovies(movies);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRandom(false);
      }
    }
  };

  useEffect(() => {
    if (viewMode === "recommendations" && randomMovies.length === 0) {
      loadRandomMovies();
    }
  }, [viewMode]);

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
    let result = movies.filter((m) => m.has_watched === (viewMode === "watched"));
    result.sort((a, b) => {
      if (sortBy === "release_date") {
        return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
      } else if (sortBy === "user_rating") {
        return b.user_rating - a.user_rating;
      } else if (sortBy === "tmdb_rating") {
        return (b.tmdb_rating || 0) - (a.tmdb_rating || 0);
      }
      return 0; // default handles "date_added" since initial fetch is ordered by created_at desc
    });
    return result;
  }, [movies, viewMode, sortBy]);

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
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
          <Clapperboard className="text-primary group-hover:scale-110 transition-transform" size={32} />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">My Movies</h1>
            <p className="text-muted-foreground text-sm"> 
              {viewMode === "recommendations" ? "Discover new films" : `${filteredMovies.length} movie${filteredMovies.length !== 1 ? "s" : ""} ${viewMode === "watched" ? "watched" : "to watch"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Discover button */}
          <button
            onClick={() => navigate("/discover")}
            className="flex px-2 sm:px-3 py-1.5 h-8 mr-1 sm:mr-2 items-center gap-1 sm:gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm rounded-lg transition-colors border border-primary/10"
          >
            <Compass size={16} /> <span className="hidden sm:inline">Discover</span>
          </button>
          
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
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="bg-muted p-1 rounded-lg flex gap-1 flex-wrap justify-center">
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
          <button
            onClick={() => setViewMode("recommendations")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "recommendations"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recommendations
          </button>
        </div>
        
        {viewMode !== "recommendations" && (
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_added">Date Added</SelectItem>
              <SelectItem value="release_date">Release Date</SelectItem>
              <SelectItem value="user_rating">Your Rating</SelectItem>
              <SelectItem value="tmdb_rating">TMDB Rating</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
      >
      {viewMode === "recommendations" ? (
        loadingRandom ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : randomMovies.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
            <Film size={48} className="mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No recommendations found.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {randomMovies.map((movie, i) => {
                const alreadyInWatchlist = watchlistTmdbIds.has(movie.id);
                const alreadyWatched = watchedTmdbIds.has(movie.id);
                return (
                  <motion.div
                    key={`rec-${movie.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.02, 0.15), duration: 0.15 }}
                    className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col"
                  >
                    <div
                      className="aspect-[2/3] bg-muted relative overflow-hidden cursor-pointer"
                      onClick={() => setPreviewTmdbMovie(movie)}
                    >
                      {getPosterUrl(movie.poster_path) ? (
                        <img
                          src={getPosterUrl(movie.poster_path)!}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={40} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2 flex flex-col flex-1">
                      <div className="cursor-pointer" onClick={() => setPreviewTmdbMovie(movie)}>
                        <h3 className="font-semibold text-sm truncate text-foreground">{movie.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {movie.release_date?.slice(0, 4) || "Unknown"} · ⭐ {(movie.vote_average ?? 0).toFixed(1)} · <span className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[10px] font-bold uppercase">{movie.media_type}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => !alreadyInWatchlist && !alreadyWatched && handleAdd(movie, 0, false)}
                        disabled={alreadyInWatchlist || alreadyWatched}
                        className={`mt-auto flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md transition-all w-full justify-center ${
                          alreadyWatched
                            ? "bg-green-500/10 text-green-600 cursor-default"
                            : alreadyInWatchlist
                            ? "bg-primary/10 text-primary cursor-default"
                            : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"
                        }`}
                      >
                        {alreadyWatched ? (
                          <><BookmarkCheck size={13} /> Watched</>  
                        ) : alreadyInWatchlist ? (
                          <><BookmarkCheck size={13} /> In Watchlist</>
                        ) : (
                          <><Bookmark size={13} /> Want to Watch</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div className="col-span-full flex flex-col items-center gap-3 mt-8">
               {loadingMore && (
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               )}
               
            </div>
          </div>
        )
      ) : filteredMovies.length === 0 ? (
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
      </motion.div>
      </AnimatePresence>

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
          mediaType={previewTmdbMovie.media_type}
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
