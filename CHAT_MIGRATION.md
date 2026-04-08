# 🗄️ Chat Migration Instructions

## Option 1: Supabase Dashboard (Easiest)

1. Go to: **https://supabase.com/dashboard/project/nzuocuifeudqipbuxrsp/sql**
2. Open the file: `supabase/migrations/20260407000000_add_chat_tables.sql`
3. Copy its entire contents
4. Paste into the SQL editor
5. Click **RUN** (or press Ctrl+Enter)
6. Verify you see: `SUCCESS. No rows returned`

### Verify the migration worked:
Run this query in the SQL editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'participants', 'messages');
```
You should see 3 rows returned.

## Option 2: Supabase CLI

If you have the Supabase CLI installed locally:
```bash
supabase link --project-ref nzuocuifeudqipbuxrsp
supabase db push
```

## Option 3: With Service Role Key

If you have your service role key, add it to `.env`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
Then run:
```bash
node scripts/run-migration.js
```

---

After applying the migration, the chat feature will work immediately — no server restart needed.
