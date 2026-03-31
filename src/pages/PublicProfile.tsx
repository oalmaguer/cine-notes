import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Film, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { supabase } from "@/integrations/supabase/client";

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

interface PublicProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [movies, setMovies] = useState<DBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"watched" | "watchlist">("watched");
  const [selectedMovie, setSelectedMovie] = useState<DBMovie | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!username) return;
      setLoading(true);
      setError("");
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (profileError || !profileData) {
        setError("User not found");
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // Fetch movies
      const { data: moviesData } = await supabase
        .from("watched_movies")
        .select("id, tmdb_id, title, overview, poster_url, release_date, tmdb_rating, user_rating, has_watched")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      setMovies((moviesData as DBMovie[]) || []);
      setLoading(false);
    }

    loadData();
  }, [username]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => m.has_watched === (viewMode === "watched"));
  }, [movies, viewMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <button onClick={() => navigate("/")} className="text-primary hover:underline">
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 md:gap-6 bg-card border border-border rounded-xl p-4 md:p-6 mb-8 relative"
      >
        <button
          onClick={() => navigate("/")}
          className="hidden sm:block p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border-2 border-border">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl md:text-2xl font-bold text-primary">
              {profile.display_name?.slice(0, 2).toUpperCase() || profile.username.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{profile.display_name || profile.username}</h1>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{profile.bio}</p>}
        </div>
      </motion.header>

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
            Watched ({movies.filter(m => m.has_watched).length})
          </button>
          <button
            onClick={() => setViewMode("watchlist")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "watchlist"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Want to Watch ({movies.filter(m => !m.has_watched).length})
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredMovies.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
          <Film size={48} className="mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">No movies found in this list.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMovies.map((movie, i) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onRemove={() => {}}
                onRate={() => {}}
                onClick={() => setSelectedMovie(movie)}
                index={i}
                readonly
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
          onRate={() => {}}
          readonly
        />
      )}
    </div>
  );
}
