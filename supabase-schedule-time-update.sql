alter table public.itinerary_items
add column if not exists time text not null default '00:00';
