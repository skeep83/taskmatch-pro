-- Create languages table for multi-language management
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create translations table for dynamic content translation
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,
  translation_key TEXT NOT NULL,
  translation_value TEXT NOT NULL,
  namespace TEXT DEFAULT 'common',
  is_pluralized BOOLEAN DEFAULT false,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(language_code, translation_key, namespace)
);

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- RLS policies for languages (public read, admin write)
CREATE POLICY "languages_public_read" ON public.languages
FOR SELECT USING (is_active = true);

CREATE POLICY "languages_admin_all" ON public.languages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for translations (public read, admin write)
CREATE POLICY "translations_public_read" ON public.translations
FOR SELECT USING (true);

CREATE POLICY "translations_admin_all" ON public.translations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Insert default languages
INSERT INTO public.languages (code, name, native_name, flag_emoji, is_active, is_default, sort_order) VALUES
('ru', 'Russian', 'Русский', '🇷🇺', true, true, 1),
('ro', 'Romanian', 'Română', '🇷🇴', true, false, 2),
('en', 'English', 'English', '🇺🇸', false, false, 3),
('fr', 'French', 'Français', '🇫🇷', false, false, 4),
('es', 'Spanish', 'Español', '🇪🇸', false, false, 5),
('de', 'German', 'Deutsch', '🇩🇪', false, false, 6),
('it', 'Italian', 'Italiano', '🇮🇹', false, false, 7),
('pl', 'Polish', 'Polski', '🇵🇱', false, false, 8),
('uk', 'Ukrainian', 'Українська', '🇺🇦', false, false, 9),
('bg', 'Bulgarian', 'Български', '🇧🇬', false, false, 10)
ON CONFLICT (code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_languages_active ON public.languages(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_default ON public.languages(is_default);
CREATE INDEX IF NOT EXISTS idx_translations_language_key ON public.translations(language_code, translation_key);
CREATE INDEX IF NOT EXISTS idx_translations_namespace ON public.translations(namespace);

-- Add app settings for language management
INSERT INTO public.app_settings (key, value, description, category) VALUES
('default_language', '{"code": "ru"}', 'Default platform language', 'localization'),
('fallback_language', '{"code": "ru"}', 'Fallback language when translation missing', 'localization'),
('auto_detect_language', '{"enabled": true}', 'Auto-detect user language from browser', 'localization'),
('rtl_languages', '{"codes": ["ar", "he", "fa", "ur"]}', 'Right-to-left languages', 'localization')
ON CONFLICT (key) DO NOTHING;