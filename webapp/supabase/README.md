# Cloud sync backend (Supabase)

The webapp works without any backend (library in the browser). To keep the library across
browsers and devices, point it at a Supabase project:

1. Create a project at https://supabase.com/dashboard (free tier is enough).
2. SQL editor → run `migrations/0001_rea_library.sql` (tables, RLS, private `rea-renders` bucket).
3. Authentication → URL configuration: set **Site URL** to where the app runs
   (for example `https://rtmendes.github.io/rea/`) and add it to **Redirect URLs**.
   Sign-in uses email magic links, so no password is stored.
4. Optional, keeps the Firecrawl key off every browser:
   `supabase functions deploy firecrawl-proxy` and `supabase secrets set FIRECRAWL_API_KEY=fc-...`
   (dashboard: Edge Functions → Secrets). Signed-in users then scrape through the proxy.
5. Give the app the project URL and the **anon / publishable** key, either
   - at build time: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (GitHub → repository
     *Variables*; the Pages workflow passes them to `npm run build`), or
   - at run time: the app's **Cloud sync** panel (stored in that browser only).

Row Level Security limits every row and file to the signed-in user. Rendered images are stored
in the private bucket and served to the owner through short-lived signed URLs.
