-- Attach trigger to keep pro_rating_stats in sync with ratings changes
DO $$ BEGIN
  EXECUTE 'drop trigger ratings_after_change_refresh_trg on public.ratings';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

create trigger ratings_after_change_refresh_trg
after insert or update or delete on public.ratings
for each row execute function public.ratings_after_change_refresh();