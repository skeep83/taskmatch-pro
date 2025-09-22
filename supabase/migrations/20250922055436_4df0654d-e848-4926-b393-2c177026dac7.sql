-- Make image_url nullable in portfolio_items since we use portfolio_media table for media storage
ALTER TABLE public.portfolio_items ALTER COLUMN image_url DROP NOT NULL;