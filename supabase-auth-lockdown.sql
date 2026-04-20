-- Create these two users first in Supabase Authentication > Users:
-- 1) jiyoung@jijun-trip.local
-- 2) junil@jijun-trip.local
--
-- The login page maps the visible IDs to the emails above:
-- user alias #1 -> jiyoung@jijun-trip.local
-- user alias #2 -> junil@jijun-trip.local

create or replace function public.is_allowed_member()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated'
    and coalesce(auth.jwt() ->> 'email', '') in (
      'jiyoung@jijun-trip.local',
      'junil@jijun-trip.local'
    );
$$;

drop policy if exists "Public can read itinerary items" on public.itinerary_items;
drop policy if exists "Public can insert itinerary items" on public.itinerary_items;
drop policy if exists "Public can update itinerary items" on public.itinerary_items;
drop policy if exists "Public can delete itinerary items" on public.itinerary_items;

create policy "Allowed members can read itinerary items"
on public.itinerary_items
for select
to authenticated
using (public.is_allowed_member());

create policy "Allowed members can insert itinerary items"
on public.itinerary_items
for insert
to authenticated
with check (public.is_allowed_member());

create policy "Allowed members can update itinerary items"
on public.itinerary_items
for update
to authenticated
using (public.is_allowed_member())
with check (public.is_allowed_member());

create policy "Allowed members can delete itinerary items"
on public.itinerary_items
for delete
to authenticated
using (public.is_allowed_member());

drop policy if exists "Public can read checklist items" on public.trip_checklist_items;
drop policy if exists "Public can insert checklist items" on public.trip_checklist_items;
drop policy if exists "Public can update checklist items" on public.trip_checklist_items;
drop policy if exists "Public can delete checklist items" on public.trip_checklist_items;

create policy "Allowed members can read checklist items"
on public.trip_checklist_items
for select
to authenticated
using (public.is_allowed_member());

create policy "Allowed members can insert checklist items"
on public.trip_checklist_items
for insert
to authenticated
with check (public.is_allowed_member());

create policy "Allowed members can update checklist items"
on public.trip_checklist_items
for update
to authenticated
using (public.is_allowed_member())
with check (public.is_allowed_member());

create policy "Allowed members can delete checklist items"
on public.trip_checklist_items
for delete
to authenticated
using (public.is_allowed_member());

drop policy if exists "Public can read expenses" on public.expenses;
drop policy if exists "Public can insert expenses" on public.expenses;
drop policy if exists "Public can delete expenses" on public.expenses;

create policy "Allowed members can read expenses"
on public.expenses
for select
to authenticated
using (public.is_allowed_member());

create policy "Allowed members can insert expenses"
on public.expenses
for insert
to authenticated
with check (public.is_allowed_member());

create policy "Allowed members can delete expenses"
on public.expenses
for delete
to authenticated
using (public.is_allowed_member());

drop policy if exists "Public can read travel record photos" on public.travel_record_photos;
drop policy if exists "Public can insert travel record photos" on public.travel_record_photos;
drop policy if exists "Public can delete travel record photos" on public.travel_record_photos;

create policy "Allowed members can read travel record photos"
on public.travel_record_photos
for select
to authenticated
using (public.is_allowed_member());

create policy "Allowed members can insert travel record photos"
on public.travel_record_photos
for insert
to authenticated
with check (public.is_allowed_member());

create policy "Allowed members can delete travel record photos"
on public.travel_record_photos
for delete
to authenticated
using (public.is_allowed_member());

update storage.buckets
set public = false
where id = 'travel-records';

drop policy if exists "Public can view travel record bucket" on storage.objects;
drop policy if exists "Public can upload travel record bucket" on storage.objects;
drop policy if exists "Public can delete travel record bucket" on storage.objects;

create policy "Allowed members can view travel record bucket"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'travel-records'
  and public.is_allowed_member()
);

create policy "Allowed members can upload travel record bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'travel-records'
  and public.is_allowed_member()
);

create policy "Allowed members can delete travel record bucket"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'travel-records'
  and public.is_allowed_member()
);
