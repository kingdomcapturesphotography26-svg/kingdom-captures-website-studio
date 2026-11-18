*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#172333;font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}button,input,textarea,select{font:inherit}button{cursor:pointer;border:0;border-radius:9px;padding:10px 14px;font-weight:650}.shell{min-height:100vh;display:grid;grid-template-columns:245px 1fr}.sidebar{background:#172b45;color:white;padding:26px 18px;display:flex;flex-direction:column}.logo{font-size:14px;font-weight:850;letter-spacing:.12em}.logo span{display:block;color:#cbd4df;font-size:10px;letter-spacing:.18em;margin-top:4px}.sidebar nav{display:grid;gap:7px;margin-top:38px}.sidebar nav button,.side-bottom button{background:transparent;color:#dce5ef;text-align:left}.sidebar nav button.active,.sidebar nav button:hover{background:#2a4566;color:white}.side-bottom{margin-top:auto;display:grid;gap:8px;color:#cbd4df;font-size:12px}.content{padding:30px;max-width:1440px;width:100%;margin:auto}.content header,.panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.content header{margin-bottom:25px}.eyebrow{color:#b18335;font-size:11px;font-weight:850;letter-spacing:.16em}h1{font-size:28px;margin:3px 0}h2{font-size:18px;margin:0 0 14px}h3{font-size:15px;margin:0 0 5px}.muted{color:#697789}.tag{display:inline-block;border-radius:99px;background:#edf1f5;color:#526175;padding:4px 9px;font-size:11px;font-weight:750}.primary{background:#1d3553;color:white}.secondary,.small{background:#edf1f5;color:#25374e}.small{padding:6px 9px;font-size:12px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}.stats>div,.panel,.auth-card{background:white;border:1px solid #e3e8ef;border-radius:15px;padding:19px;box-shadow:0 3px 12px #172b4508}.stats b{display:block;font-size:28px}.stats span{font-size:12px;color:#697789}.panel{margin-bottom:17px}.business-list{display:grid}.business-list article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #edf0f4}.business-list article:last-child{border:0}.business-list p{margin:3px 0;font-size:13px;color:#697789}.narrow{max-width:720px}.panel label,.auth-card label{display:grid;gap:5px;margin:12px 0;font-size:12px;font-weight:750;color:#526175}.panel input,.panel textarea,.panel select,.auth-card input{width:100%;border:1px solid #d9e0e8;border-radius:8px;padding:10px;background:#fff;color:#172333}.editor-grid{display:grid;grid-template-columns:minmax(300px,.9fr) minmax(300px,1.1fr);gap:16px}.site-preview{background:white;border:1px solid #e3e8ef;border-radius:15px;overflow:hidden;align-self:start}.site-hero{padding:30px;background:linear-gradient(135deg,#172b45,#42627f);color:white}.site-hero span{font-size:10px;letter-spacing:.18em;color:#e5c47f;font-weight:800}.site-hero h2{font-size:28px;margin:12px 0}.site-hero p{color:#e1e9f1}.site-hero button{background:#d5aa5c;color:#182638}.site-content{padding:22px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chips span{background:#eef2f6;border-radius:99px;padding:5px 10px;font-size:12px}.invite-form{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}.invite-form label{margin:0}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #e9edf2;font-size:13px}th{color:#697789}.notice{background:#fff6df;color:#70541c;padding:11px 13px;border-radius:9px;margin:12px 0;font-size:13px}.notice button{float:right;background:transparent;padding:0}.auth,.setup{min-height:100vh;display:grid;place-items:center;padding:20px}.auth-card{width:min(440px,100%);padding:28px}.auth-card h1{margin:5px 0 8px}.auth-card form button{width:100%;margin-top:10px}.text-button{background:transparent;color:#31557c;margin-top:12px;padding-left:0}.setup .auth-card{width:min(620px,100%)}.setup li{margin:8px 0}.center{min-height:100vh;display:grid;place-items:center}footer{color:#8590a0;font-size:11px;margin:25px 0}@media(max-width:850px){.shell{grid-template-columns:1fr}.sidebar{padding:16px}.sidebar nav{display:flex;flex-wrap:wrap;margin-top:15px}.side-bottom{margin-top:15px;display:flex;justify-content:space-between}.content{padding:18px}.editor-grid{grid-template-columns:1fr}}@media(max-width:560px){.stats{grid-template-columns:1fr}.content header{align-items:flex-start;flex-direction:column}.invite-form{grid-template-columns:1fr}}
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
end; $$;
revoke all on function public.accept_business_invitation(uuid) from public;
grant execute on function public.accept_business_invitation(uuid) to authenticated;

-- Bootstrap note:
-- For the first administrator, create your account, then run:
-- insert into public.businesses(name) values ('Kingdom Captures Internal Workspace') returning id;
-- Then add your auth.users UUID to business_memberships with role='admin'.
