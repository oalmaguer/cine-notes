import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchMovies, TMDBMovie, getPosterUrl } from "@/lib/tmdb";
import { StarRating } from "./StarRating";

interface MovieSearchProps {
  onAdd: (movie: TMDBMovie, rating: number) => void;
  watchedIds: Set<number>;
}

export function MovieSearch({ onAdd, watchedIds }: MovieSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const movies = await searchMovies(q);
      setResults(movies);
      setIsOpen(true);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = (movie: TMDBMovie) => {
    const rating = selectedRating[movie.id] || 3;
    onAdd(movie, rating);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a movie..."
          className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden scrollbar-thin max-h-[420px] overflow-y-auto"
          >
            {results.map((movie) => {
              const alreadyAdded = watchedIds.has(movie.id);
              return (
                <div
                  key={movie.id}
                  className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors border-b border-border last:border-0"
                >
                  <div className="w-12 h-[72px] rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {getPosterUrl(movie.poster_path, "w200") ? (
                      <img
                        src={getPosterUrl(movie.poster_path, "w200")!}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {movie.release_date?.slice(0, 4) || "Unknown"} · ⭐ {movie.vote_average.toFixed(1)}
                    </p>
                    {!alreadyAdded && (
                      <div className="mt-1">
                        <StarRating
                          rating={selectedRating[movie.id] || 0}
                          onRate={(r) => setSelectedRating((p) => ({ ...p, [movie.id]: r }))}
                          size={14}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(movie)}
                    disabled={alreadyAdded}
                    className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
