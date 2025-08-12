-- Enable realtime and updated_at triggers

-- 1) Ensure REPLICA IDENTITY FULL for realtime tables
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

-- 2) Add tables to supabase_realtime publication (create if absent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.chat_messages, public.chats;
  ELSE
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if already added
      NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;

-- 3) Create updated_at triggers where applicable
-- Helper: create trigger if not exists wrapper
DO $$
BEGIN
  -- jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_jobs'
  ) THEN
    CREATE TRIGGER set_updated_at_jobs
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- tenders
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_tenders'
  ) THEN
    CREATE TRIGGER set_updated_at_tenders
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- pricing_templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_pricing_templates'
  ) THEN
    CREATE TRIGGER set_updated_at_pricing_templates
    BEFORE UPDATE ON public.pricing_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- escrows
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_escrows'
  ) THEN
    CREATE TRIGGER set_updated_at_escrows
    BEFORE UPDATE ON public.escrows
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- wallets
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_wallets'
  ) THEN
    CREATE TRIGGER set_updated_at_wallets
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- business_accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_business_accounts'
  ) THEN
    CREATE TRIGGER set_updated_at_business_accounts
    BEFORE UPDATE ON public.business_accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;