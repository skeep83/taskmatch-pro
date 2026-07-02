alter table public.profiles
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists address_notes text,
  add column if not exists location_public_label text,
  add column if not exists location_precision text,
  add column if not exists location_source text;

comment on column public.profiles.address_line1 is 'Primary private address line for the client home/base location';
comment on column public.profiles.address_line2 is 'Secondary private address line such as apartment, entrance, floor';
comment on column public.profiles.postal_code is 'Postal or ZIP code';
comment on column public.profiles.address_notes is 'Private delivery/access notes for the client home/base location';
comment on column public.profiles.location_public_label is 'Coarse public location label safe to show to professionals before acceptance';
comment on column public.profiles.location_precision is 'Precision of the saved base location: exact, street, district, city';
comment on column public.profiles.location_source is 'How the saved base location was derived: device_gps, address_geocode, ip_geolocate';
