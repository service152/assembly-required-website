# ARHS Office v3

Adds:
- Customer/job photo storage structure
- Estimate-to-invoice conversion workflow
- Payment link fields
- Review-request tracking
- Calendar export (.ics)
- Expanded Supabase schema

Setup:
1. Create Supabase project.
2. Run supabase/schema-v3.sql.
3. Paste your Supabase URL and anon key into config.js.
4. Upload all files to /office on your website.
5. Open /office and sign in.

Keep Markate until payments and messaging are fully tested.

## v4 integration package
Also run `supabase/schema-v4.sql` and read `INTEGRATIONS.md`.
This adds secure server-side Stripe Checkout, Stripe payment webhook handling, private job-photo storage, and a Google Calendar event function.
