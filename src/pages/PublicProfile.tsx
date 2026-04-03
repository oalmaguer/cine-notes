import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Film, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [submittingFollow, setSubmittingFollow] = useState(false);

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

      if (user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

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
  }, [username, user]);

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    setSubmittingFollow(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
    }
    setSubmittingFollow(false);
  };

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => m.has_watched === (viewMode === "watched"));
  }, [movies, viewMode]);

  const stats = useMemo(() => {
    let watched = 0;
    let wantToWatch = 0;
    let totalRating = 0;
    let ratedCount = 0;

    movies.forEach((m) => {
      if (m.has_watched) {
        watched++;
        if (m.user_rating > 0) {
          totalRating += m.user_rating;
          ratedCount++;
        }
      } else {
        wantToWatch++;
      }
    });

    return {
      watched,
      wantToWatch,
      avgRating: ratedCount ? totalRating / ratedCount : 0,
    };
  }, [movies]);

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
        className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-card border border-border rounded-xl p-4 md:p-6 mb-8 relative"
      >
        <div className="flex items-center gap-4 md:gap-6 flex-1 w-full">
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
            {user && user.id !== profile.id && (
              <button
                onClick={handleFollowToggle}
                disabled={submittingFollow}
                className={`mt-4 px-6 py-2 rounded-full font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 ${
                  isFollowing 
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto md:ml-auto">
          <div className="bg-muted/50 p-3 rounded-xl text-center border border-border/50">
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats.watched}</div>
            <div className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Watched</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl text-center border border-border/50">
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats.wantToWatch}</div>
            <div className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Watchlist</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl text-center border border-border/50">
            <div className="text-xl md:text-2xl font-bold text-primary">{stats.avgRating.toFixed(1)}</div>
            <div className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Avg Rating</div>
          </div>
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
