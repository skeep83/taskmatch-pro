-- Добавляем отсутствующее поле otp_code в таблицу jobs
ALTER TABLE public.jobs 
ADD COLUMN otp_code TEXT;