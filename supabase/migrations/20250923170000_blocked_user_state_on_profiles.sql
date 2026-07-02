-- Phase 2: move blocked-user semantics out of app_role and into profile access-state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked_true
  ON public.profiles (is_blocked)
  WHERE is_blocked = true;

-- Defensive migration from any legacy/non-canonical blocked-role rows, if they exist.
UPDATE public.profiles p
SET
  is_blocked = true,
  blocked_at = COALESCE(p.blocked_at, now()),
  blocked_reason = COALESCE(p.blocked_reason, 'Migrated from legacy blocked role')
FROM public.user_roles ur
WHERE ur.user_id = p.id
  AND ur.role::text = 'blocked';

DELETE FROM public.user_roles
WHERE role::text = 'blocked';
