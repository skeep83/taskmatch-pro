-- Seed basic categories if table is empty
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories LIMIT 1) THEN
    INSERT INTO public.categories (key, label_ru, label_ro) VALUES
      ('plumbing','Сантехника','Instalații sanitare'),
      ('electrical','Электрика','Electrică'),
      ('cleaning','Уборка','Curățenie'),
      ('painting','Малярные работы','Pictură'),
      ('moving','Переезды/грузчики','Mutări'),
      ('gardening','Сад/ландшафт','Grădinărit');
  END IF;
END $$;