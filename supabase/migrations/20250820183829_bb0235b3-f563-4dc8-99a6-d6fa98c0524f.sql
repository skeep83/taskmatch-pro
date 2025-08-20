-- Create currencies table
CREATE TABLE public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- USD, EUR, RUB, RON, etc.
  name_en TEXT NOT NULL,
  name_ru TEXT,
  name_ro TEXT,
  symbol TEXT NOT NULL, -- $, €, ₽, lei
  exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0, -- Rate relative to base currency (USD)
  is_base BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Create policies for currencies
CREATE POLICY "currencies_select_all" ON public.currencies
FOR SELECT USING (true);

CREATE POLICY "currencies_admin_all" ON public.currencies
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default currencies
INSERT INTO public.currencies (code, name_en, name_ru, name_ro, symbol, exchange_rate, is_base, is_active) VALUES
('USD', 'US Dollar', 'Доллар США', 'Dolar american', '$', 1.0, true, true),
('EUR', 'Euro', 'Евро', 'Euro', '€', 0.85, false, true),
('RUB', 'Russian Ruble', 'Российский рубль', 'Rubla rusă', '₽', 75.0, false, true),
('RON', 'Romanian Leu', 'Румынский лей', 'Leu românesc', 'lei', 4.5, false, true);

-- Create exchange rates history table for tracking rate changes
CREATE TABLE public.exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  old_rate NUMERIC(10,4) NOT NULL,
  new_rate NUMERIC(10,4) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on exchange rate history
ALTER TABLE public.exchange_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_history_admin_select" ON public.exchange_rate_history
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "exchange_history_admin_insert" ON public.exchange_rate_history
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to log exchange rate changes
CREATE OR REPLACE FUNCTION log_exchange_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.exchange_rate != NEW.exchange_rate THEN
    INSERT INTO public.exchange_rate_history (currency_id, old_rate, new_rate, changed_by)
    VALUES (NEW.id, OLD.exchange_rate, NEW.exchange_rate, auth.uid());
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for exchange rate changes
CREATE TRIGGER exchange_rate_change_trigger
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION log_exchange_rate_change();

-- Add currency support to platform settings
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on platform settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_admin_all" ON public.platform_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default currency settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
('default_currency', '"USD"', 'Default platform currency code', 'currency'),
('supported_currencies', '["USD", "EUR", "RUB", "RON"]', 'List of supported currency codes', 'currency'),
('auto_currency_detection', 'true', 'Automatically detect user currency by location', 'currency'),
('currency_conversion_enabled', 'true', 'Enable automatic currency conversion', 'currency');

-- Create trigger for updated_at on platform_settings
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();