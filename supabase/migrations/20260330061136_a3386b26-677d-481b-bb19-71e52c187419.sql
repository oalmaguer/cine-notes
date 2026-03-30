
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Watched movies table
CREATE TABLE public.watched_movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  poster_url TEXT,
  release_date TEXT,
  tmdb_rating NUMERIC(3,1),
  user_rating INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tmdb_id)
);

ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own movies" ON public.watched_movies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own movies" ON public.watched_movies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own movies" ON public.watched_movies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own movies" ON public.watched_movies FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_watched_movies_updated_at
  BEFORE UPDATE ON public.watched_movies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments table
CREATE TABLE public.movie_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.watched_movies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own comments" ON public.movie_comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own comments" ON public.movie_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.movie_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.movie_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_movie_comments_updated_at
  BEFORE UPDATE ON public.movie_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
