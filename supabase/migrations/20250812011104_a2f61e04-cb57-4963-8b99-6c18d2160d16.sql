-- Public catalog enablement + rating aggregates

-- 1) Public SELECT for pro profiles and pro categories
CREATE POLICY IF NOT EXISTS "pro_profiles_public_select"
ON public.pro_profiles
FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "pro_categories_public_select"
ON public.pro_categories
FOR SELECT
USING (true);

-- 2) Aggregated ratings table maintained by trigger
CREATE TABLE IF NOT EXISTS public.pro_rating_stats (
  pro_id uuid PRIMARY KEY,
  avg_score numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_rating_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "pro_rating_stats_public_select"
ON public.pro_rating_stats
FOR SELECT
USING (true);

-- Function to recompute stats for a pro (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.refresh_pro_rating_stats(_pro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(score)::numeric, 0), COALESCE(COUNT(*), 0)
  INTO v_avg, v_count
  FROM public.ratings
  WHERE to_user_id = _pro_id;

  INSERT INTO public.pro_rating_stats AS s (pro_id, avg_score, rating_count, updated_at)
  VALUES (_pro_id, v_avg, v_count, now())
  ON CONFLICT (pro_id)
  DO UPDATE SET avg_score = EXCLUDED.avg_score,
                rating_count = EXCLUDED.rating_count,
                updated_at = now();
END;
$$;

-- Trigger to refresh stats on ratings changes
CREATE OR REPLACE FUNCTION public.ratings_after_change_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_pro_rating_stats(COALESCE(NEW.to_user_id, OLD.to_user_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ratings_refresh ON public.ratings;
CREATE TRIGGER trg_ratings_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.ratings_after_change_refresh();
