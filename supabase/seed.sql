-- EscrowPay Global Supabase seed (production path, P1).
-- The P0 demo seeds the in-memory store instead (see src/lib/db/seed.ts).
--
-- Usage: create the three auth users first (Supabase Auth admin API), then
-- run this file with their UUIDs substituted below. The demo store uses the
-- fixed UUIDs shown here so both paths share identities.

-- insert into auth.users (id, email, ...) -- create via Auth admin API first!

insert into public.profiles (id, email, name, role) values
  ('00000000-0000-4000-8000-000000000001', 'client@escrowpay.demo', 'Ada Okafor', 'client'),
  ('00000000-0000-4000-8000-000000000002', 'freelancer@escrowpay.demo', 'Kwame Mensah', 'freelancer'),
  ('00000000-0000-4000-8000-000000000003', 'admin@escrowpay.demo', 'Platform Admin', 'admin')
on conflict (id) do update set email = excluded.email, name = excluded.name, role = excluded.role;
