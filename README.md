# Puzzle #44 — blog with admin panel, Supabase-backed (no redeploy)

Brief (Task Forge puzzle tracker): blog with admin panel, Supabase-backed, no redeploy — Supabase.

A two-page static site backed by Supabase:
- **`index.html`** — public blog. Read-only; shows only *published* posts.
- **`admin.html`** — admin panel. Create / edit / delete / publish posts.
  Publishing a post makes it appear on the public blog **with no redeploy** —
  content lives in the database, not in the deployed files.

## Architecture & security

Writes never use a write-capable database key in the browser. Instead:
- `puzzle44_posts` has RLS allowing anon to read **only** `status =
  'published'` rows — drafts are invisible to the public even via direct API.
- The admin key lives in a private table (`puzzle44_admin`) with RLS enabled
  and **no policy** — deny-all, so nothing can read it directly.
- All admin actions go through **key-gated `SECURITY DEFINER` RPCs**
  (`puzzle44_admin_list/upsert/delete`) that verify the admin key before doing
  anything. The browser only ever holds the admin key in session memory and
  the public anon key (read-only by RLS). Same pattern as puzzle #11.
- The key-check helper is not directly callable (execute revoked from API
  roles) — verified: a direct call returns `permission denied`, while the
  admin RPCs that call it internally still work.

> Note: Supabase's linter flags the SECURITY DEFINER RPCs as "anon-executable"
> and the admin table as "RLS enabled, no policy." Both are **intentional** here
> — the RPCs are meant to be anon-callable but are gated by the key check, and
> the admin table's no-policy is a deliberate deny-all. (A production build for
> higher stakes would use Supabase Auth with a real admin user instead of a
> shared key.)

## Verified live (full CRUD + the "no redeploy" claim)

- **Backend RPCs** (direct REST): wrong admin key → `unauthorized`; correct key
  lists all posts; created a draft; **public anon read saw only the published
  post, not the draft** (RLS working); delete RPC returned `true`.
- **Admin UI** (claude-in-chrome): entered the admin key → unlocked; filled the
  form and published a new post ("Saved."); confirmed the row in the database.
- **No-redeploy proof**: revisited the *unchanged* public blog page afterward —
  the newly-published post appeared alongside the seed post. The deployed files
  never changed; only the database did.

(Test posts were deleted afterward, leaving the single seed post.)

## Setup
Apply `schema.sql` (set your own admin key in the `puzzle44_admin` insert).
The anon key in `blog.js`/`admin.js` is the publishable key (safe to ship,
RLS-protected). Serve the folder from any static host — no build step.

## Deploy
`wrangler.jsonc` included (static Worker). Public deploy pending the same
one-time `wrangler login` as puzzles #35/#39/#40/#43.
