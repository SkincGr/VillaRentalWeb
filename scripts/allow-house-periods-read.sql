-- Table and permissions for house_to_periods in Supabase
create table if not exists public.house_to_periods (
  house_to_periods_aid serial primary key,
  f_house_aid integer references public.houses(house_aid),
  start_month integer not null default 5,
  start_day integer not null default 1,
  end_month integer not null default 10,
  end_day integer not null default 20,
  efective_startyear integer not null default 2000,
  efective_endyear integer not null default 2099
);

alter table public.house_to_periods enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.house_to_periods to anon, authenticated;

drop policy if exists "Allow app to read house periods" on public.house_to_periods;
create policy "Allow app to read house periods"
on public.house_to_periods
for select
to anon, authenticated
using (true);

drop policy if exists "Allow app to write house periods" on public.house_to_periods;
create policy "Allow app to write house periods"
on public.house_to_periods
for all
to anon, authenticated
using (true)
with check (true);

-- Insert standard operating period 01/05 - 20/10 (1 May - 20 October) for Villa Winston (house_aid: 1)
insert into public.house_to_periods (f_house_aid, start_month, start_day, end_month, end_day, efective_startyear, efective_endyear)
select 1, 5, 1, 10, 20, 2000, 2099
where not exists (
  select 1 from public.house_to_periods where f_house_aid = 1
);

-- Verification
select
  f_house_aid,
  start_month,
  start_day,
  end_month,
  end_day,
  efective_startyear,
  efective_endyear
from public.house_to_periods
order by f_house_aid, efective_startyear;
