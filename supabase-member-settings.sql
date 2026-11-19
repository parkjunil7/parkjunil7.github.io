create table public.travel_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_alias text unique not null
);
alter table public.travel_members enable row level security;
revoke all on public.travel_members from public, anon, authenticated;
grant select on public.travel_members to authenticated;
create policy "Members can read their own profile" on public.travel_members
  for select to authenticated using (user_id = (select auth.uid()));

create function public.travel_login_email(supplied_alias text)
returns text language sql stable security definer set search_path = ''
as $$
  select u.email::text from auth.users u join public.travel_members m on m.user_id = u.id
  where m.login_alias = supplied_alias;
$$;
revoke all on function public.travel_login_email(text) from public, anon, authenticated;
grant execute on function public.travel_login_email(text) to service_role;

create table public.travel_site_settings (
  scope text primary key,
  details jsonb not null
);
alter table public.travel_site_settings enable row level security;
revoke all on public.travel_site_settings from public, anon, authenticated;
grant select on public.travel_site_settings to authenticated;
create policy "Members can read trip settings" on public.travel_site_settings
  for select to authenticated using (exists (select 1 from public.travel_members where user_id = (select auth.uid())));
