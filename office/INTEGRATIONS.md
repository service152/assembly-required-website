# ARHS Office v4 integrations

## Stripe payments
Deploy `create-checkout-session` and `stripe-webhook` as Supabase Edge Functions.
Set these Supabase function secrets:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- APP_URL=https://assemblyrequiredms.com/office

Create a Stripe webhook pointing to the deployed `stripe-webhook` function and listen for `checkout.session.completed`.
Never put the Stripe secret key in `config.js` or browser code.

## Job photos
Run `supabase/schema-v4.sql`. It creates a private `job-photos` bucket and authenticated policies.
Small images can use standard Supabase uploads. Compress phone photos before uploading when possible.

## Google Calendar
Create a Google Cloud project, enable Calendar API, configure OAuth consent, and create a Web application OAuth client.
Use the narrow Calendar event scope needed by the app. Add your office URL as an authorized JavaScript origin and redirect URI.
The included function accepts an OAuth access token and creates an event on the primary Google Calendar.

For iCloud visibility, add the same Google account to Apple Calendar on the iPhone. Jobs created in Google Calendar will then appear in Apple Calendar.

## Important
These integrations cannot become live until the account owner creates and authorizes the Stripe, Supabase, and Google credentials.
