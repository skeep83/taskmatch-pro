-- Create portfolio_media table for multiple files per portfolio item
CREATE TABLE IF NOT EXISTS portfolio_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image' or 'video'
  file_size INTEGER,
  file_name TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for portfolio_media
ALTER TABLE portfolio_media ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_media
CREATE POLICY "portfolio_media_owner_insert" 
ON portfolio_media FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolio_items pi 
    WHERE pi.id = portfolio_media.portfolio_item_id 
    AND pi.pro_id = auth.uid()
  )
);

CREATE POLICY "portfolio_media_owner_update" 
ON portfolio_media FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM portfolio_items pi 
    WHERE pi.id = portfolio_media.portfolio_item_id 
    AND pi.pro_id = auth.uid()
  )
);

CREATE POLICY "portfolio_media_owner_delete" 
ON portfolio_media FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM portfolio_items pi 
    WHERE pi.id = portfolio_media.portfolio_item_id 
    AND pi.pro_id = auth.uid()
  )
);

CREATE POLICY "portfolio_media_public_select" 
ON portfolio_media FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_portfolio_media_item_id ON portfolio_media(portfolio_item_id);
CREATE INDEX idx_portfolio_media_order ON portfolio_media(portfolio_item_id, display_order);