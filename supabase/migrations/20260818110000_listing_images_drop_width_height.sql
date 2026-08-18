alter table public.listing_images
  drop column if exists width,
  drop column if exists height;
