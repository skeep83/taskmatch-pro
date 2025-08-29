-- Simply make evidence bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'evidence';