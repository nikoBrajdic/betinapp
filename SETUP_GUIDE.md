# Setting up Betinapp

This guide connects a new machine to the **existing household project**.
It does not rebuild or reset the live database.

## Development machine

1. Install Node.js 22 LTS and run `npm ci` in the repository.
2. Obtain `.env.local` from the project owner. It is gitignored.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Optionally set `NEXT_PUBLIC_SITE_URL_DEV=http://localhost:3000` to force
   the local OAuth callback. Do not set this development override in Vercel.
4. Run `npm run dev` and open `http://localhost:3000`.

The application uses the Supabase client with the signed-in user's session;
its actions do not require a service-role key. Google credentials belong in
Supabase's provider configuration, not in the application environment.
`NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is a legacy, unused variable.

## OAuth configuration

In Google Cloud, configure a Web application OAuth client with this authorized
redirect URI:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

In Supabase → Authentication → Providers → Google, enter that client's ID and
secret. In Authentication → URL Configuration, set the production Site URL
and allow the app callback URLs listed in [PUBLISHING.md](PUBLISHING.md).

The app redirects to the host that initiated sign-in, unless the explicit
`NEXT_PUBLIC_SITE_URL_DEV` override is set. Supabase must allow that callback
URL or it may fall back to the production Site URL.

## Family access

After migration 036 is applied:

1. An existing superadmin adds the new member's Google email under Settings /
   Manage Admins. Email matching is case-insensitive.
2. The member signs in with Google. A pending join request is created and
   they are signed out.
3. A superadmin approves the request.
4. The member signs in again. The database creates their approved profile;
   they receive full household access.

Existing approved profiles remain valid while their Auth email is allowlisted.
Removing the allowlist entry revokes database access even for existing sessions.
An OAuth account alone does not grant household membership. Invite-code pages
are legacy and are not the supported onboarding route.

## Database setup and changes

Use [PUBLISHING.md](PUBLISHING.md) for the current migration sequence. Do not
replay `scripts/001` onward against an existing project: the directory includes
sample data, one-time fixes, destructive replacements, and two files numbered
027. Migration 010, for example, drops the old tasks table.

For a completely new Supabase project, prepare and review a current schema
baseline and bootstrap the first approved profile/allowlist entry in the SQL
editor. The repository does not yet provide an automated clean-database setup.
`prisma/schema.prisma` is historical reference material, not the runtime schema.

## Verify setup

Run `npm run check` and `npm run build`. Then check signed-out access, approved
member sign-in, a pending member, saving a note, and a guest-stay edit. Use a
disposable Supabase project for destructive or access-policy experiments.

If sign-in goes to the wrong host, check the app's development override and
Supabase callback allowlist. If access is denied, check the Auth email,
allowlist, profile, and join-request approval. If a database function is
missing, apply the release's pending migration before deploying its code.
