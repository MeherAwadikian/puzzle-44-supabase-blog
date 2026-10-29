-- Puzzle #44 schema (applied to the live Supabase project via MCP migrations).

create table if not exists public.puzzle44_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.puzzle44_posts enable row level security;

-- Public reads ONLY published posts (drafts stay private).
create policy "puzzle44 public read published"
  on public.puzzle44_posts for select to anon using (status = 'published');

-- Private admin-key store: RLS enabled with NO policy == deny all direct access.
-- Only the SECURITY DEFINER functions below can read it. (The "RLS enabled, no
-- policy" advisor INFO on this table is intentional, not an oversight.)
create table if not exists public.puzzle44_admin (id int primary key default 1, admin_key text not null);
alter table public.puzzle44_admin enable row level security;
insert into public.puzzle44_admin (id, admin_key) values (1, '<<SET YOUR ADMIN KEY>>')
  on conflict (id) do nothing;

-- Internal key check (NOT directly callable — execute revoked from API roles).
create or replace function public.puzzle44_check_key(p_key text)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.puzzle44_admin where admin_key = p_key);
$$;
revoke execute on function public.puzzle44_check_key(text) from anon, authenticated, public;

-- Admin CRUD via key-gated SECURITY DEFINER RPCs, so the browser never holds a
-- write-capable DB key. Each verifies the admin key before doing anything.
create or replace function public.puzzle44_admin_list(p_key text)
returns setof public.puzzle44_posts language plpgsql security definer set search_path = public as $$
begin
  if not public.puzzle44_check_key(p_key) then raise exception 'unauthorized'; end if;
  return query select * from public.puzzle44_posts order by updated_at desc;
end; $$;

create or replace function public.puzzle44_admin_upsert(
  p_key text, p_slug text, p_title text, p_excerpt text, p_body text, p_status text)
returns public.puzzle44_posts language plpgsql security definer set search_path = public as $$
declare rec public.puzzle44_posts;
begin
  if not public.puzzle44_check_key(p_key) then raise exception 'unauthorized'; end if;
  if p_status not in ('draft','published') then raise exception 'invalid status'; end if;
  insert into public.puzzle44_posts (slug, title, excerpt, body, status)
    values (p_slug, p_title, coalesce(p_excerpt,''), coalesce(p_body,''), p_status)
  on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt,
    body = excluded.body, status = excluded.status, updated_at = now()
  returning * into rec;
  return rec;
end; $$;

create or replace function public.puzzle44_admin_delete(p_key text, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.puzzle44_check_key(p_key) then raise exception 'unauthorized'; end if;
  delete from public.puzzle44_posts where id = p_id;
  return found;
end; $$;
