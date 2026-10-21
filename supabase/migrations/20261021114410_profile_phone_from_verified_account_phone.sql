-- A phone verified at sign-up is the person's contact phone too. Copy it into
-- the profile the moment it is confirmed (only if they have not set one), so the
-- app never has to ask for it again. auth.users stores it without the +.
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
as $function$
BEGIN
  -- Sinhronizuj email_verified_at
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET email_verified_at = NEW.email_confirmed_at,
        updated_at        = NOW()
    WHERE id = NEW.id;
  END IF;

  -- Sinhronizuj email ako se promijeni
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
    SET email      = CASE WHEN NEW.email IS NOT NULL THEN LOWER(TRIM(NEW.email)) ELSE NULL END,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  -- Sinhronizuj phone_verified_at
  IF NEW.phone_confirmed_at IS NOT NULL AND OLD.phone_confirmed_at IS NULL THEN
    UPDATE public.users
    SET phone_verified_at = NEW.phone_confirmed_at,
        updated_at        = NOW()
    WHERE id = NEW.id;

    -- Potvrđen broj je ujedno i kontakt telefon na profilu
    UPDATE public.user_profiles
    SET phone      = '+' || ltrim(NEW.phone, '+'),
        updated_at = NOW()
    WHERE user_id = NEW.id AND phone IS NULL AND NEW.phone IS NOT NULL;
  END IF;

  -- Sinhronizuj phone ako se promijeni
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.users
    SET phone      = NEW.phone,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Accounts that already verified a phone before this migration.
update public.user_profiles up
set phone = '+' || ltrim(u.phone, '+'), updated_at = now()
from public.users u
where u.id = up.user_id
  and u.phone_verified_at is not null
  and u.phone is not null
  and up.phone is null;
