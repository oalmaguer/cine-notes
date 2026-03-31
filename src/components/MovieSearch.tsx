import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Film, User, ArrowLeft, Clapperboard, BookmarkPlus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  searchMovies,
  searchPerson,
  getPersonMovies,
  TMDBMovie,
  TMDBPerson,
  getPosterUrl,
  getProfileUrl,
} from "@/lib/tmdb";
import { StarRating } from "./StarRating";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MovieSearchProps {
  onAdd: (movie: TMDBMovie, rating: number, has_watched: boolean) => void;
  watchedIds: Set<number>;
  watchlistIds: Set<number>;
  onPreview?: (movie: TMDBMovie) => void;
}

type Mode = "movie" | "actor";

interface SelectedActor {
  person: TMDBPerson;
  movies: TMDBMovie[];
}

export function MovieSearch({ onAdd, watchedIds, watchlistIds, onPreview }: MovieSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("movie");
  const [movieResults, setMovieResults] = useState<TMDBMovie[]>([]);
  const [actorResults, setActorResults] = useState<TMDBPerson[]>([]);
  const [selectedActor, setSelectedActor] = useState<SelectedActor | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mode from query prefix: "@" triggers actor mode
  const isActorMode = mode === "actor";

  const effectiveQuery = isActorMode ? query.replace(/^@\s*/, "").trim() : query.trim();

  const doSearch = useCallback(
    async (q: string, currentMode: Mode) => {
      if (!q.trim()) {
        setMovieResults([]);
        setActorResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        if (currentMode === "actor") {
          const people = await searchPerson(q);
          setActorResults(people);
          setMovieResults([]);
        } else {
          const movies = await searchMovies(q);
          setMovieResults(movies);
          setActorResults([]);
        }
        setIsOpen(true);
      } catch {
        setMovieResults([]);
        setActorResults([]);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    // Auto-switch mode when query starts with "@"
    if (query.startsWith("@")) {
      setMode("actor");
      setSelectedActor(null);
    }
  }, [query]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (selectedActor) return; // Don't search while viewing filmography
    debounceRef.current = setTimeout(() => doSearch(effectiveQuery, mode), 400);
    return () => clearTimeout(debounceRef.current);
  }, [effectiveQuery, mode, doSearch, selectedActor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleActorSelect = async (person: TMDBPerson) => {
    setLoading(true);
    setIsOpen(false);
    try {
      const movies = await getPersonMovies(person.id);
      setSelectedActor({ person, movies });
    } catch {
      setSelectedActor(null);
    }
    setLoading(false);
  };

  const handleBackToSearch = () => {
    setSelectedActor(null);
    setQuery("");
    setMode("movie");
    setActorResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAddWatched = (movie: TMDBMovie) => {
    const rating = selectedRating[movie.id] || 3;
    onAdd(movie, rating, true);
    if (!selectedActor) {
      setQuery("");
      setMovieResults([]);
      setIsOpen(false);
    }
  };

  const handleAddWatchlist = (movie: TMDBMovie) => {
    onAdd(movie, 0, false);
    if (!selectedActor) {
      setQuery("");
      setMovieResults([]);
      setIsOpen(false);
    }
  };

  const toggleMode = () => {
    const next: Mode = mode === "movie" ? "actor" : "movie";
    setMode(next);
    setSelectedActor(null);
    setMovieResults([]);
    setActorResults([]);
    setQuery(next === "actor" ? "@" : "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasResults =
    (mode === "movie" && movieResults.length > 0) ||
    (mode === "actor" && actorResults.length > 0);

  return (
    <TooltipProvider delayDuration={400}>
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      {/* Actor filmography view */}
      <AnimatePresence>
        {selectedActor && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ top: "100%" }}
          >
            {/* Actor header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-card/60">
              <button
                onClick={handleBackToSearch}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              {selectedActor.person.profile_path ? (
                <img
                  src={getProfileUrl(selectedActor.person.profile_path)!}
                  alt={selectedActor.person.name}
                  className="w-10 h-10 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User size={16} className="text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedActor.person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedActor.movies.length} movies · {selectedActor.person.known_for_department}
                </p>
              </div>
            </div>

            {/* Movie list */}
            <div className="max-h-[380px] overflow-y-auto">
              {selectedActor.movies.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No movies found for this actor.
                </div>
              ) : (
                selectedActor.movies.map((movie) => {
                  const alreadyAdded = watchedIds.has(movie.id);
                  const alreadyWatchlisted = watchlistIds.has(movie.id);
                  return (
                    <Tooltip key={movie.id}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => onPreview?.(movie)}
                          className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors border-b border-border last:border-0 cursor-pointer"
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
                              {movie.release_date?.slice(0, 4) || "Unknown"} · ⭐{" "}
                              {movie.vote_average.toFixed(1)}
                            </p>
                            {!alreadyAdded && (
                              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                <StarRating
                                  rating={selectedRating[movie.id] || 0}
                                  onRate={(r) =>
                                    setSelectedRating((p) => ({ ...p, [movie.id]: r }))
                                  }
                                  size={14}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAddWatchlist(movie)}
                              disabled={alreadyWatchlisted || alreadyAdded}
                              title="Want to Watch"
                              className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <BookmarkPlus size={16} />
                            </button>
                            <button
                              onClick={() => handleAddWatched(movie)}
                              disabled={alreadyAdded}
                              title="Mark as Watched"
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs z-[60]">
                        <p className="text-sm">{movie.overview || "No description available."}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          {isActorMode ? (
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
          ) : (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setIsOpen(true)}
            placeholder={isActorMode ? "Search by actor… (e.g. @Tom Hanks)" : "Search for a movie…"}
            className={`w-full bg-card border rounded-xl pl-12 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
              isActorMode
                ? "border-primary/50 focus:ring-primary/40"
                : "border-border focus:ring-ring/50"
            }`}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Mode toggle pill */}
        <button
          onClick={toggleMode}
          title={isActorMode ? "Switch to movie search" : "Switch to actor search"}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
            isActorMode
              ? "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          }`}
        >
          {isActorMode ? <User size={14} /> : <Clapperboard size={14} />}
          <span className="hidden sm:inline">{isActorMode ? "Actor" : "Movie"}</span>
        </button>
      </div>

      {/* Hint below input */}
      {!isActorMode && !query && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-1">
          Tip: type <kbd className="px-1 py-0.5 bg-muted rounded text-[11px]">@actor name</kbd> to search by actor
        </p>
      )}

      {/* Movie results dropdown */}
      <AnimatePresence>
        {isOpen && !selectedActor && hasResults && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto"
          >
            {/* Actor results */}
            {mode === "actor" &&
              actorResults.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleActorSelect(person)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors border-b border-border last:border-0 text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {person.profile_path ? (
                      <img
                        src={getProfileUrl(person.profile_path)!}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.known_for_department}</p>
                  </div>
                  <Film size={14} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))}

            {/* Movie results */}
            {mode === "movie" &&
              movieResults.map((movie) => {
                const alreadyAdded = watchedIds.has(movie.id);
                const alreadyWatchlisted = watchlistIds.has(movie.id);
                return (
                  <Tooltip key={movie.id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => onPreview?.(movie)}
                        className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors border-b border-border last:border-0 cursor-pointer"
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
                            {movie.release_date?.slice(0, 4) || "Unknown"} · ⭐{" "}
                            {movie.vote_average.toFixed(1)}
                          </p>
                          {!alreadyAdded && (
                            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                              <StarRating
                                rating={selectedRating[movie.id] || 0}
                                onRate={(r) =>
                                  setSelectedRating((p) => ({ ...p, [movie.id]: r }))
                                }
                                size={14}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAddWatchlist(movie)}
                            disabled={alreadyWatchlisted || alreadyAdded}
                            title="Want to Watch"
                            className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <BookmarkPlus size={16} />
                          </button>
                          <button
                            onClick={() => handleAddWatched(movie)}
                            disabled={alreadyAdded}
                            title="Mark as Watched"
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs z-[60]">
                      <p className="text-sm">{movie.overview || "No description available."}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </TooltipProvider>
  );
}
