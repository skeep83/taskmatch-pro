-- Make image_url column nullable in portfolio_items table
-- since we're storing media in a separate portfolio_media table
ALTER TABLE portfolio_items ALTER COLUMN image_url DROP NOT NULL;