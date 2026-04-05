import { Trash2, Film, Check } from "lucide-react";
import { motion } from "framer-motion";
import { StarRating } from "./StarRating";

interface MovieCardProps {
  movie: {
    id: string;
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    release_date: string | null;
    tmdb_rating: number | null;
    user_rating: number;
    has_watched: boolean;
  };
  onRemove: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onClick: () => void;
  index: number;
  onToggleWatched?: () => void;
  readonly?: boolean;
}

export function MovieCard({ movie, onRemove, onRate, onClick, index, onToggleWatched, readonly = false }: MovieCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.02, 0.15), duration: 0.15 }}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[2/3] bg-muted relative overflow-hidden">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={40} className="text-muted-foreground" />
          </div>
        )}
        {!readonly && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(movie.id); }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-sm truncate text-foreground">{movie.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {movie.release_date?.slice(0, 4) || "Unknown"} · ⭐ {(movie.tmdb_rating ?? 0).toFixed(1)}
          </p>
        </div>
        {movie.has_watched ? (
          <div onClick={(e) => e.stopPropagation()}>
            <StarRating rating={movie.user_rating} onRate={(r) => !readonly && onRate(movie.id, r)} size={14} interactive={!readonly} />
          </div>
        ) : (
          !readonly && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatched?.(); }}
              className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1.5 rounded-md font-medium transition-colors w-full justify-center mt-1"
            >
              <Check size={14} /> Mark as Watched
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}
