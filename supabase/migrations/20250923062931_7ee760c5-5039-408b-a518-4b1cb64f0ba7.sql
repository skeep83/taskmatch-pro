-- Проверяем и создаем политики RLS для таблицы categories
-- Разрешаем всем аутентифицированным пользователям читать активные категории

-- Сначала удаляем старые политики если есть
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;

-- Создаем новую политику для чтения категорий
CREATE POLICY "Everyone can read active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- Добавляем политику для админов на управление категориями
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));