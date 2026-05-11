alter table public.expenses
  add column if not exists trip_key text;

alter table public.trip_checklist_items
  add column if not exists trip_key text;

alter table public.itinerary_items
  add column if not exists trip_key text;

alter table public.travel_record_photos
  add column if not exists trip_key text;

update public.expenses
set trip_key = coalesce(trip_key, 'china-2026')
where trip_key is null;

update public.trip_checklist_items
set trip_key = coalesce(trip_key, 'china-2026')
where trip_key is null;

update public.itinerary_items
set trip_key = coalesce(trip_key, 'china-2026')
where trip_key is null;

update public.travel_record_photos
set trip_key = coalesce(trip_key, 'china-2026')
where trip_key is null;

alter table public.expenses
  alter column trip_key set not null;

alter table public.trip_checklist_items
  alter column trip_key set not null;

alter table public.itinerary_items
  alter column trip_key set not null;

alter table public.travel_record_photos
  alter column trip_key set not null;

alter table public.trip_checklist_items
  drop constraint if exists trip_checklist_items_slug_key;

alter table public.trip_checklist_items
  drop constraint if exists trip_checklist_items_slug_unique;

create unique index if not exists trip_checklist_items_trip_key_slug_key
  on public.trip_checklist_items (trip_key, slug);

create index if not exists expenses_trip_key_idx
  on public.expenses (trip_key);

create index if not exists trip_checklist_items_trip_key_idx
  on public.trip_checklist_items (trip_key);

create index if not exists itinerary_items_trip_key_idx
  on public.itinerary_items (trip_key);

create index if not exists travel_record_photos_trip_key_idx
  on public.travel_record_photos (trip_key);
