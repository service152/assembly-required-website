ARHS Office 2.0.1 Cache Fix

Replace these files in /office:
- index.html
- app.js
- styles.css

Keep config.js.

This build:
- Removes old service workers
- Deletes old app caches
- Forces fresh CSS and JavaScript with version tags
- Shows "Build 2.0.1" at bottom-right
- Shows JavaScript errors on screen
- Includes working login and navigation buttons
- Includes working Add Lead, Add Job, Add Estimate, and Add Invoice buttons

After push:
1. Open /office/?v=201
2. Confirm "Build 2.0.1" appears at bottom-right
3. If it does not, Cloudflare/GitHub is still serving old files.
