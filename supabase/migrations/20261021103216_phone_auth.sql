-- Add phone as a second account identifier, mirroring how email already
-- flows from auth.users into public.users. Email becomes optional since an
-- account may now be phone-only.
alter table public.users
  alter column email drop not null,
  add column phone varchar null,
  add column phone_verified_at timestamptz null,
  add constraint users_identifier_present check (email is not null or phone is not null);

create unique index users_phone_key on public.users (phone) where phone is not null;

-- NOTE: this column-level revoke is inert while authenticated holds table-level
-- UPDATE; 20261021104249_user_profiles_column_writes.sql is the one that
-- actually closes it.
revoke update (phone_verified_at) on table public.user_profiles from authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $function$
BEGIN
  -- Upiši u public.users
  INSERT INTO public.users (id, email, email_verified_at, phone, phone_verified_at, created_at, updated_at)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email IS NOT NULL THEN LOWER(TRIM(NEW.email)) ELSE NULL END,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    NEW.phone,
    CASE WHEN NEW.phone_confirmed_at IS NOT NULL THEN NEW.phone_confirmed_at ELSE NULL END,
    NOW(),
    NOW()
  );

  -- Upiši prazan profil
  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());

  RETURN NEW;
END;
$function$;

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
