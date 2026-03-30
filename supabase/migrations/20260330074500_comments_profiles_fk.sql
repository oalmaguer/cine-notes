-- Add FK from movie_comments.user_id → profiles.id
-- This lets PostgREST discover the relationship for joins
ALTER TABLE public.movie_comments
  ADD CONSTRAINT movie_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
