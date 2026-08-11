-- The application uses the Supabase anon role for all read requests.
-- Without this policy, house_to_periods exists but returns an empty result.

alter table public.house_to_periods enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.house_to_periods to anon, authenticated;

drop policy if exists "Allow app to read house periods" on public.house_to_periods;

create policy "Allow app to read house periods"
on public.house_to_periods
for select
to anon, authenticated
using (true);

-- This result must be greater than zero if periods have been entered.
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
