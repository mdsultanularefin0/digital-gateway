
Remove IMAP functionality completely from the project. Support Inbox page and all IMAP-related code will be deleted. SMTP (outgoing mail) stays for sending order confirmations, password resets, etc.

**Files to delete:**
- `src/pages/admin/AdminSupportInbox.tsx` — the inbox UI page

**Files to edit:**

1. **`src/components/admin/integrations/MailTab.tsx`**
   - Remove `IMAP_FIELDS` constant
   - Remove the entire IMAP card (host, port, username, password, Test IMAP button)
   - Remove `"imap"` from `testConnection` type union
   - Keep SMTP and Sender Addresses sections

2. **`supabase/functions/mail/index.ts`**
   - Remove `imapFetch` function and `escapeImapString` helper
   - Remove handler actions: `test-imap`, `fetch-inbox`, `read-email`
   - Keep: `test-smtp`, `send-email`, and `smtpSend`

3. **`src/App.tsx`** — remove the `/admin/support-inbox` route and its import

4. **`src/components/AdminLayout.tsx`** — remove the "Support Inbox" nav link (need to verify it's listed there)

5. **Database cleanup** — delete IMAP keys from `mail_config` table:
   ```sql
   DELETE FROM mail_config WHERE key IN ('imap_host','imap_port','imap_username','imap_password');
   ```

6. **Edge function redeploy** — `mail` function will be redeployed automatically with SMTP-only logic.

The `mail` edge function is kept (still needed for SMTP send). No need to call delete_edge_functions.
