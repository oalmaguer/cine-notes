import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MovieDetail } from "@/components/MovieDetail";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Loader2, ArrowLeft, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { TMDBMovie } from "@/lib/tmdb";

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);

  useEffect(() => {
    async function loadDiscover() {
      setLoading(true);
      // Fetch recent watches from everyone
      // Future improvement: Fetch only from followed users if authenticated
      const { data, error } = await supabase
        .from("watched_movies")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("has_watched", true)
        .order("created_at", { ascending: false })
        .limit(30);
      
      if (data) {
        setActivities(data);
      }
      setLoading(false);
    }
    loadDiscover();
  }, []);

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
             <button onClick={() => navigate("/")} className="mr-2 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
               <ArrowLeft size={24} />
             </button>
             <Compass className="text-primary" /> Discover
          </h1>
          <p className="text-muted-foreground mt-2 ml-14">See what the community is watching recently.</p>
        </div>
      </header>

      <div className="space-y-6">
        {activities.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
             <Compass size={48} className="mx-auto opacity-50 mb-4" />
             No recent activity found.
          </div>
        ) : (
          activities.map((activity) => (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               key={activity.id} 
               className="bg-card border border-border rounded-xl p-4 md:p-6"
             >
               <div className="flex items-center gap-3 mb-4">
                  {/* avatar */}
                  <Link to={`/u/${activity.profiles?.username}`} className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                     {activity.profiles?.avatar_url ? (
                       <img src={activity.profiles.avatar_url} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                          {activity.profiles?.display_name?.slice(0, 2).toUpperCase() || activity.profiles?.username?.slice(0, 2).toUpperCase() || "UN"}
                       </div>
                     )}
                  </Link>
                  <div>
                     <Link to={`/u/${activity.profiles?.username}`} className="font-semibold text-foreground hover:underline">
                        {activity.profiles?.display_name || activity.profiles?.username}
                     </Link>
                     <span className="text-muted-foreground text-sm ml-2">watched a movie • {new Date(activity.created_at).toLocaleDateString()}</span>
                     {activity.user_rating > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-500 mt-1 bg-yellow-500/10 w-fit px-2 py-0.5 rounded-full">
                          ⭐ Rated {activity.user_rating} / 5
                        </div>
                     )}
                  </div>
               </div>

               <div className="flex gap-4 cursor-pointer hover:bg-surface-hover p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-border/50" onClick={() => setSelectedMovie(activity)}>
                  <div className="w-20 md:w-24 h-32 md:h-36 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      {activity.poster_url ? (
                         <img src={activity.poster_url} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full text-xs flex items-center justify-center text-muted-foreground">No Image</div>
                      )}
                  </div>
                  <div className="flex-1 mt-1">
                     <h3 className="font-bold text-base md:text-lg text-foreground">{activity.title}</h3>
                     <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 mt-2 leading-relaxed">{activity.overview}</p>
                     <div className="mt-4 flex items-center gap-4">
                       <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
                         <Heart size={16} /> Like
                       </button>
                     </div>
                  </div>
               </div>
             </motion.div>
          ))
        )}
      </div>

      {selectedMovie && (
        <MovieDetail
          tmdbId={selectedMovie.tmdb_id}
          movieDbId={selectedMovie.id}
          userRating={user && user.id === selectedMovie.user_id ? selectedMovie.user_rating : 0}
          onClose={() => setSelectedMovie(null)}
          onRate={() => {}}
          readonly
        />
      )}
    </div>
  )
}
