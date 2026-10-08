# Activate Gmail-compatible email verification

Email login is implemented but remains unavailable until the owner configures a Supabase project and email delivery. ChatGPT sign-in works independently. No codes are simulated.

1. Create a Supabase project. Enable email authentication and new-user signups. Keep email confirmation enabled. This project uses Supabase Auth only; favourites remain in the Site's D1 database.
2. In Authentication → Email Templates, change the Magic Link template to show `{{ .Token }}` instead of a confirmation link. Example: `<p>Your SaveHalf verification code is {{ .Token }}.</p>`. Configure six-digit OTPs and a ten-minute expiry in Auth settings. Keep provider rate limits enabled.
3. Configure custom SMTP with an email service and a verified sender domain. Supabase's default email service only sends to project team members; custom SMTP is needed for arbitrary Gmail recipients. Configure SPF, DKIM and DMARC as instructed by your sender provider.
4. Set the Site URL to `https://savehalf.sharmagaurab534.chatgpt.site`. Add these runtime environment variables through Sites settings, then redeploy:
   - `SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY`: the project's publishable key (legacy anon key also works). Never use the service-role or secret key.
5. For another hosting provider, configure the same server environment variables and apply all SQL migrations in `drizzle/` to the D1 binding `DB`. A local `.dev.vars` is ignored by git; do not include credentials in a ZIP.
6. Test with two Gmail accounts: send a real code, verify it, save different products, sign out and sign back in. Each account must retain its own favourites. Test an incorrect, expired and reused code; each must fail. Check spam delivery and resend throttling.

## Implemented controls

Supabase sends and verifies codes. The server independently checks `/auth/v1/user` before trusting any session. A confirmed provider user UUID, rather than client-provided email, owns each favourite list. The access token is held only in a Secure, HttpOnly, SameSite=Lax cookie, with a maximum one-hour session; sign in again after expiry. Refresh tokens are not stored. Logout clears the cookie and requests provider logout. No OTP, token or email is logged by the application.

Same-origin checks protect code requests, verification, logout and favourite changes. Persistent hashed-address and IP rate limits restrict sending and guessing, alongside Supabase's limits. Provider failures never produce a success message. Catalogue administration continues to require the platform-authenticated owner. ChatGPT accounts and email accounts have separate favourite lists; they are not linked automatically.

These controls support the school project's cybersecurity demonstration. They do not certify compliance with a particular standard. Before a public production launch, review provider configuration, abuse protection, data retention and recovery requirements.

Official references:
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits
