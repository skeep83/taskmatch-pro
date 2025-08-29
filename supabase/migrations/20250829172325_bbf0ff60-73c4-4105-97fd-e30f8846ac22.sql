-- Insert a test notification to check the system works
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  title_ro,
  message,
  message_ro,
  data,
  is_read
) VALUES (
  'd3117828-1618-4c73-aee1-5968538d95d0',
  'job_match',
  'Новый заказ рядом с вами!',
  'Comandă nouă în apropierea ta!',
  'Найден новый заказ "Ремонт крана" в категории Сантехника',
  'Găsită comandă nouă "Reparație robinet" în categoria Instalații sanitare',
  '{"job_id": "d0335195-00d0-43c9-80fc-21b307cd998c", "job_title": "Ремонт крана", "category": "Сантехника", "budget_min": 50000, "budget_max": 100000}',
  false
);