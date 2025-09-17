-- First, remove duplicate ratings, keeping only the most recent one
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY job_id, from_user_id, to_user_id 
      ORDER BY created_at DESC
    ) as rn
  FROM public.ratings
)
DELETE FROM public.ratings 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.ratings 
ADD CONSTRAINT ratings_unique_per_job_user_pair 
UNIQUE (job_id, from_user_id, to_user_id);

-- Update RLS policy to allow users to update their own ratings
DROP POLICY IF EXISTS "ratings_update_from_user" ON public.ratings;

CREATE POLICY "ratings_update_from_user" 
ON public.ratings 
FOR UPDATE 
USING (from_user_id = auth.uid());

-- Add updated_at column to track when ratings are modified
ALTER TABLE public.ratings 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ratings_updated_at();