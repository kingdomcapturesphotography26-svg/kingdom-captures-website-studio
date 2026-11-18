-- Kingdom Captures Website Studio
-- Run this in Supabase SQL Editor. Uses Supabase Auth for passwords.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  headline text,
  description text,
  services text[] not null default '{}',
  phone text,
  email text,
  logo_url text,
  hero_image_url text,
  domain text,
  website_status text not null default 'draft'
    check (website_status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','owner','editor')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','editor','admin')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  unique (business_id,email)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.business_memberships m where m.business_id=target_business and m.user_id=auth.uid()); $$;

create or replace function public.has_business_role(target_business uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.business_memberships m where m.business_id=target_business and m.user_id=auth.uid() and m.role=any(allowed_roles)); $$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.business_invitations enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select using (id=auth.uid());
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists "members read businesses" on public.businesses;
create policy "members read businesses" on public.businesses for select using (public.is_business_member(id));
drop policy if exists "admins create businesses" on public.businesses;
create policy "admins create businesses" on public.businesses for insert with check (auth.uid() is not null);
drop policy if exists "admins update businesses" on public.businesses;
create policy "admins update businesses" on public.businesses for update using (public.has_business_role(id,array['admin','owner','editor'])) with check (public.has_business_role(id,array['admin','owner','editor']));
drop policy if exists "admins delete businesses" on public.businesses;
create policy "admins delete businesses" on public.businesses for delete using (public.has_business_role(id,array['admin']));

drop policy if exists "members read memberships" on public.business_memberships;
create policy "members read memberships" on public.business_memberships for select using (public.is_business_member(business_id));
drop policy if exists "admins manage memberships" on public.business_memberships;
create policy "admins manage memberships" on public.business_memberships for all using (public.has_business_role(business_id,array['admin'])) with check (public.has_business_role(business_id,array['admin']));

drop policy if exists "admins read invitations" on public.business_invitations;
create policy "admins read invitations" on public.business_invitations for select using (public.has_business_role(business_id,array['admin']));
drop policy if exists "admins create invitations" on public.business_invitations;
create policy "admins create invitations" on public.business_invitations for insert with check (public.has_business_role(business_id,array['admin']) and invited_by=auth.uid());
drop policy if exists "admins revoke invitations" on public.business_invitations;
create policy "admins revoke invitations" on public.business_invitations for update using (public.has_business_role(business_id,array['admin'])) with check (public.has_business_role(business_id,array['admin']));

drop policy if exists "members read audit" on public.audit_logs;
create policy "members read audit" on public.audit_logs for select using (business_id is not null and public.is_business_member(business_id));

-- Create a profile automatically after signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'name','')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Accept a pending invitation only when the signed-in email matches the invitation.
create or replace function public.accept_business_invitation(invitation_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare inv public.business_invitations%rowtype;
begin
  select * into inv from public.business_invitations where id=invitation_id for update;
  if not found then raise exception 'Invitation not found'; end if;
  if inv.status <> 'pending' or inv.expires_at < now() then raise exception 'Invitation is no longer valid'; end if;
  if lower(inv.email) <> lower((select email from auth.users where id=auth.uid())) then raise exception 'Sign in with the invited email address'; end if;
  insert into public.business_memberships(business_id,user_id,role) values(inv.business_id,auth.uid(),inv.role)
  on conflict (business_id,user_id) do update set role=excluded.role;
  update public.business_invitations set status='accepted' where id=invitation_id;
  insert into public.audit_logs(business_id,actor_id,action,details) values(inv.business_id,auth.uid(),'invitation_accepted',jsonb_build_object('role',inv.role));
end;
$$;
revoke all on function public.accept_business_invitation(uuid) from public;
grant execute on function public.accept_business_invitation(uuid) to authenticated;
