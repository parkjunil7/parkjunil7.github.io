create policy "Public can update itinerary items"
on public.itinerary_items
for update
to anon
using (true)
with check (true);
