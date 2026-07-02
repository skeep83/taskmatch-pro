-- Variant C lifecycle guards: allow client edits/deletes only before provider selection,
-- and lock media changes after assignment/escrow while still allowing cancellation.

CREATE OR REPLACE FUNCTION public.is_job_locked_state(
  _status text,
  _pro_id uuid,
  _job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _has_escrow boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.escrows e WHERE e.job_id = _job_id
  ) INTO _has_escrow;

  RETURN COALESCE(_pro_id IS NOT NULL, false)
    OR COALESCE(_has_escrow, false)
    OR COALESCE(_status IN ('accepted', 'in_progress', 'done', 'cancelled'), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_job_client_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _uid uuid := auth.uid();
  _jwt_role text := current_setting('request.jwt.claim.role', true);
  _is_admin boolean := COALESCE(public.has_role(_uid, 'admin'::app_role), false);
  _locked_old boolean := public.is_job_locked_state(OLD.status, OLD.pro_id, OLD.id);
  _client_material_change boolean := false;
BEGIN
  IF _jwt_role = 'service_role' OR _is_admin THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF _uid = OLD.client_id AND _locked_old THEN
      RAISE EXCEPTION 'Locked jobs cannot be deleted after provider selection or escrow creation';
    END IF;
    RETURN OLD;
  END IF;

  IF _uid = OLD.client_id THEN
    _client_material_change :=
      NEW.title IS DISTINCT FROM OLD.title OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.category_id IS DISTINCT FROM OLD.category_id OR
      NEW.location_address IS DISTINCT FROM OLD.location_address OR
      NEW.budget_min_cents IS DISTINCT FROM OLD.budget_min_cents OR
      NEW.budget_max_cents IS DISTINCT FROM OLD.budget_max_cents OR
      NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at OR
      NEW.urgency IS DISTINCT FROM OLD.urgency;

    IF _locked_old THEN
      IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
        RETURN NEW;
      END IF;

      IF _client_material_change THEN
        RAISE EXCEPTION 'Locked jobs cannot be edited after provider selection or escrow creation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_job_client_lifecycle ON public.jobs;
CREATE TRIGGER trg_enforce_job_client_lifecycle
BEFORE UPDATE OR DELETE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_job_client_lifecycle();

CREATE OR REPLACE FUNCTION public.enforce_job_media_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _uid uuid := auth.uid();
  _jwt_role text := current_setting('request.jwt.claim.role', true);
  _is_admin boolean := COALESCE(public.has_role(_uid, 'admin'::app_role), false);
  _job_id uuid;
  _job_client_id uuid;
  _job_status text;
  _job_pro_id uuid;
BEGIN
  IF _jwt_role = 'service_role' OR _is_admin THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  _job_id := COALESCE(NEW.job_id, OLD.job_id);

  SELECT j.client_id, j.status, j.pro_id
  INTO _job_client_id, _job_status, _job_pro_id
  FROM public.jobs j
  WHERE j.id = _job_id;

  IF _uid = _job_client_id AND public.is_job_locked_state(_job_status, _job_pro_id, _job_id) THEN
    RAISE EXCEPTION 'Locked job media cannot be changed after provider selection or escrow creation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_job_media_lifecycle ON public.job_photos;
CREATE TRIGGER trg_enforce_job_media_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON public.job_photos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_job_media_lifecycle();
