# BankRo

## Supabase live coinflip feed

This build supports Supabase for the public coinflip feed. Without Supabase environment variables it falls back to localStorage.

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/coinflip.sql`.
3. In the Supabase project settings, copy the **Project URL** and **Publishable key**.
4. Put them in your `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

5. Install dependencies and run the project.

The publishable/anon key is intended for browser use; never put a `service_role` key in `.env` for the frontend.

### What this fixes

- Coinflips are stored in Postgres instead of only browser localStorage.
- Multiple browsers/devices see the same waiting/active coinflips.
- New games, joins, cancellations and deletions propagate through Supabase Realtime.
- The balance header is refreshed after a resolved win.
- Empty inventories stay empty after a player loses all pets; starter pets are only granted to a never-initialized inventory.
- Added a short loss sound in addition to the existing click/flip/win sounds.

### Important production warning

The existing app uses custom Roblox-bio verification rather than Supabase Auth. The SQL policies in `coinflip.sql` are therefore deliberately permissive for testing. They are **not safe for real-value custody** because a client could forge writes.

Before using real Robux/pets, move balance changes, pet transfers, and winner resolution into a trusted server/Edge Function and enforce RLS. Supabase supports database functions/RPC and server-side functions for this.
