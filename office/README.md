# ARHS Office 2.0

This is the complete replacement frontend for the current prototype.

## Replace these files in /office
- index.html
- app.js
- styles.css
- manifest.webmanifest
- sw.js
- icons/icon.svg

## Keep your current file
- config.js

Your existing config.js contains the live Supabase URL and publishable key.

## Features
- Secure email magic-link login
- Dashboard
- Leads with search, filters, add, and edit
- Customer cards
- Jobs
- Estimates
- Estimate-to-invoice conversion
- Invoices
- Price book
- Mobile navigation
- iPhone home-screen installation
- Supabase cloud syncing

After replacing the files:
1. Commit
2. Push
3. Wait for Cloudflare
4. Refresh /office/
5. Sign in
6. Add a test lead
