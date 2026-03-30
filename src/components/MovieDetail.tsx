import { useState, useEffect, useCallback } from "react";
import { X, Film, Clock, Star, MessageSquare, Send, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getMovieDetails, TMDBMovieDetail, getPosterUrl, getProfileUrl } from "@/lib/tmdb";
import { StarRating } from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MovieDetailProps {
  tmdbId: number;
  movieDbId: string;
  userRating: number;
  onClose: () => void;
  onRate: (id: string, rating: number) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function MovieDetail({ tmdbId, movieDbId, userRating, onClose, onRate }: MovieDetailProps) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data: commentRows } = await supabase
      .from("movie_comments")
      .select("id, content, created_at, user_id")
      .eq("movie_id", movieDbId)
      .order("created_at", { ascending: false });

    if (!commentRows || commentRows.length === 0) {
      setComments([]);
      return;
    }

    // Batch-fetch profiles for all commenters in one query
    const userIds = [...new Set(commentRows.map((c) => c.user_id))];
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

    setComments(
      commentRows.map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) ?? null,
      }))
    );
  }, [movieDbId]);

  useEffect(() => {
    getMovieDetails(tmdbId).then((d) => { setDetail(d); setLoading(false); });
    fetchComments();
  }, [tmdbId, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    await supabase.from("movie_comments").insert({
      movie_id: movieDbId,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment("");
    await fetchComments();
    setSubmitting(false);
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from("movie_comments").delete().eq("id", id);
    await fetchComments();
  };

  const director = detail?.credits?.crew.find((c) => c.job === "Director");
  const cast = detail?.credits?.cast.slice(0, 12) || [];

  const getCommentAuthor = (comment: Comment) => {
    if (comment.profiles?.display_name) return comment.profiles.display_name;
    if (comment.profiles?.username) return `@${comment.profiles.username}`;
    return "Anonymous";
  };

  const getCommentAvatar = (comment: Comment) => {
    const name = comment.profiles?.display_name || comment.profiles?.username || "?";
    return { url: comment.profiles?.avatar_url, initials: name.slice(0, 2).toUpperCase() };
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-10"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl relative overflow-hidden my-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background transition-colors"
          >
            <X size={18} />
          </button>

          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : detail ? (
            <div>
              {/* Header */}
              <div className="flex gap-5 p-6 pb-4">
                <div className="w-32 h-48 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {detail.poster_path ? (
                    <img src={getPosterUrl(detail.poster_path)!} alt={detail.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Film size={32} className="text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 space-y-2 pt-1">
                  <h2 className="text-xl font-bold text-foreground">{detail.title}</h2>
                  {detail.tagline && <p className="text-sm text-primary italic">"{detail.tagline}"</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{detail.release_date?.slice(0, 4)}</span>
                    {detail.runtime && <span className="flex items-center gap-1"><Clock size={12} /> {detail.runtime} min</span>}
                    <span className="flex items-center gap-1"><Star size={12} /> {detail.vote_average.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {detail.genres.map((g) => (
                      <span key={g.id} className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full">{g.name}</span>
                    ))}
                  </div>
                  {director && <p className="text-xs text-muted-foreground pt-1">Directed by <span className="text-foreground font-medium">{director.name}</span></p>}
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1">Your rating</p>
                    <StarRating rating={userRating} onRate={(r) => onRate(movieDbId, r)} size={18} />
                  </div>
                </div>
              </div>

              {/* Overview */}
              {detail.overview && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{detail.overview}</p>
                </div>
              )}

              {/* Cast */}
              {cast.length > 0 && (
                <div className="px-6 pb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Cast</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {cast.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {getProfileUrl(c.profile_path) ? (
                            <img src={getProfileUrl(c.profile_path)!} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-accent" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="border-t border-border px-6 py-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare size={14} /> Comments ({comments.length})
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submitting}
                    className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {comments.map((c) => {
                    const { url, initials } = getCommentAvatar(c);
                    const isOwn = c.user_id === user?.id;
                    return (
                      <div key={c.id} className="group flex items-start gap-2.5 bg-muted/50 rounded-lg p-3">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 flex items-center justify-center">
                          {url ? (
                            <img src={url} alt={initials} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-semibold text-primary">{initials}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-foreground">{getCommentAuthor(c)}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {/* Note: always use text content, never dangerouslySetInnerHTML */}
                          <p className="text-sm text-foreground">{c.content}</p>
                        </div>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity flex-shrink-0 mt-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-muted-foreground">Failed to load movie details</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
