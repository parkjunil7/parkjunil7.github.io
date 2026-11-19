create table private.travel_receipt_requests (
 request_id uuid primary key, user_id uuid not null, created_at timestamptz not null default now()
);
alter table private.travel_receipt_requests enable row level security;
revoke all on private.travel_receipt_requests from public, anon, authenticated;
grant select,insert,delete on private.travel_receipt_requests to service_role;
create function public.reserve_travel_receipt(p_user_id uuid,p_request_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(673419029);
 if exists(select 1 from private.travel_receipt_requests where request_id=p_request_id)
 or (select count(*) from private.travel_receipt_requests where user_id=p_user_id and created_at >= (date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) >= 20
 or (select count(*) from private.travel_receipt_requests where created_at >= (date_trunc('month',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) >= 300 then return false; end if;
 insert into private.travel_receipt_requests(request_id,user_id) values(p_request_id,p_user_id);
 delete from private.travel_receipt_requests where created_at < now()-interval '90 days';
 return true;
end;
$$;
revoke all on function public.reserve_travel_receipt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_travel_receipt(uuid,uuid) to service_role;
