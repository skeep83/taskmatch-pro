-- Mutual two-sided ratings after order completion.
-- 1. Ratings become publicly readable (trust signal for the whole platform)
-- 2. Inserts restricted to actual job participants, only for completed jobs,
--    one rating per job per rater, score 1..5
-- 3. Aggregated stats exposed via user_rating_stats view

-- Deduplicate before adding the unique constraint (keep the newest)
DELETE FROM public.ratings r
USING public.ratings r2
WHERE r.job_id = r2.job_id
  AND r.from_user_id = r2.from_user_id
  AND r.created_at < r2.created_at;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ratings_score_range') THEN
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_score_range CHECK (score BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ratings_one_per_job_rater') THEN
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_one_per_job_rater UNIQUE (job_id, from_user_id);
  END IF;
END $$;

-- Public visibility: ratings are a platform-wide trust signal
DROP POLICY IF EXISTS ratings_select_involved_or_admin ON public.ratings;
DROP POLICY IF EXISTS ratings_select_public ON public.ratings;
CREATE POLICY ratings_select_public ON public.ratings FOR SELECT USING (true);

-- Strict insert: only the two participants of a completed job may rate each other
DROP POLICY IF EXISTS ratings_insert_from_user ON public.ratings;
DROP POLICY IF EXISTS ratings_insert_participants ON public.ratings;
CREATE POLICY ratings_insert_participants ON public.ratings FOR INSERT WITH CHECK (
  from_user_id = auth.uid()
  AND from_user_id <> to_user_id
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id
      AND j.status = 'done'
      AND (
        (j.client_id = from_user_id AND j.pro_id = to_user_id)
        OR (j.pro_id = from_user_id AND j.client_id = to_user_id)
      )
  )
);

-- Aggregated rating per user (works for pros, clients and companies alike)
CREATE OR REPLACE VIEW public.user_rating_stats AS
SELECT
  to_user_id AS user_id,
  round(avg(score)::numeric, 2)::float8 AS avg_rating,
  count(*)::int AS rating_count
FROM public.ratings
GROUP BY to_user_id;

GRANT SELECT ON public.user_rating_stats TO anon, authenticated;
