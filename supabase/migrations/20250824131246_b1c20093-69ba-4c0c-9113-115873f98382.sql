-- Обновляем символ молдавского лея на "Lei"
UPDATE currencies 
SET symbol = 'Lei'
WHERE code = 'MDL';