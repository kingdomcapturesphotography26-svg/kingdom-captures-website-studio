# Kingdom Captures Website Studio

A React + Vite starter application for managing client website drafts, Supabase Auth accounts, business memberships, owner invitations and an isolated owner/editor workspace.

## Included
- Sign-up/sign-in UI backed by Supabase Auth
- Business records and editable website content
- Per-business memberships and roles
- Admin invitation records and email-matched invitation acceptance RPC
- Row Level Security policies in `supabase/schema.sql`
- Website preview and draft workflow

## Important limitations
This is a starter implementation, not a deployed production service. The app does not yet send invitation emails, publish generated business websites, connect custom domains, transfer domain registrars, process payments, or move legal ownership. The invitation UI currently creates an invitation record; to send an actual email, add a Supabase Edge Function with an email provider and a one-time token flow. Before production, have the SQL/RLS reviewed, test with separate admin and owner accounts, add rate limits, backup/restore, audit coverage and account recovery. Never expose a Supabase service-role key in the browser.

## Local setup
1. Install Node.js LTS.
2. Create a Supabase project (free tier availability/limits can change).
3. In Supabase SQL Editor, run `supabase/schema.sql`.
4. In Supabase Authentication settings, enable email/password and configure site URL/redirect URLs.
5. Copy `.env.example` to `.env`; fill in the project URL and anon/public key.
6. Run:
   ```bash
   npm install
   npm run dev
   ```
7. Open the local URL printed by Vite.

## First admin bootstrap
The database intentionally does not grant admin access to arbitrary signups. After creating your own account, use the Supabase SQL Editor to create a business record and membership for your user. Find your user UUID in Authentication > Users, then run:
```sql
insert into public.businesses(name, city, headline)
values ('Kingdom Captures Internal Workspace', 'Tri-Cities, WA', 'Website Studio')
returning id;

-- Replace BUSINESS_UUID and YOUR_AUTH_USER_UUID with actual values:
insert into public.business_memberships(business_id,user_id,role)
values ('BUSINESS_UUID','YOUR_AUTH_USER_UUID','admin');
```
Create each client business while signed in as an administrator, or provision it securely from a trusted server-side function.

## Hosting
The frontend can be deployed to a static host such as Cloudflare Pages or Netlify free tier if eligible; Supabase hosts auth/database separately. Check current provider limits, commercial-use terms and pricing before choosing. Custom domains usually require paid domain registration. Free hosting does not mean free domain ownership or unlimited bandwidth.

## Ownership model
Recommended approach: keep the domain registered to the client from day one where possible; give the client owner-level access to their own business workspace; transfer registrar/domain and hosting billing directly with documented approval. Treat website content, photography licenses, source code and domain control as separate items in a written agreement.
