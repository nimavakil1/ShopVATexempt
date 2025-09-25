# Shopify VAT Exemption App

This repository contains a reference implementation of a custom Shopify app that validates EU VAT numbers at checkout and toggles the native `tax_exempt` flag for eligible customers. It is designed for stores that need to remove VAT for business buyers outside Belgium while staying compliant with EU regulations.

## Project Structure

```
apps/
  web/                      # Node/Express backend with VIES + Admin API integrations
  checkout-ui-extension/    # Checkout UI Extension that captures VAT numbers
```

### apps/web

* Exposes REST endpoints (`/vat/validate`, `/vat/apply`, `/vat/revoke`) for the checkout extension and admin tools.
* Validates VAT numbers against the EU VIES service with 24h caching.
* Updates customer tax exemption status and metafields through the Shopify Admin GraphQL API.
* Processes `customers/update` webhooks to automatically revoke the exemption when a buyer moves to Belgium or outside the EU.

### apps/checkout-ui-extension

* Renders a VAT number field inside checkout.
* Calls the backend through an App Proxy to validate and apply exemptions in real time.
* Shows inline feedback to the buyer and refreshes checkout totals when taxes are removed.

## Development

1. Create a `.env` file based on `.env.example` and supply your Shopify app credentials, admin API token, and optional `REDIS_URL`.
2. Install dependencies with `npm install` (uses workspaces).
3. Start the backend locally with `npm run dev --workspace apps/web`.
4. Build the checkout UI extension with `npm run build --workspace apps/checkout-ui-extension` and push it using the Shopify CLI.

Remember to configure an App Proxy pointing to `/vat/*` and register the `customers/update` webhook in your Partner app setup.
