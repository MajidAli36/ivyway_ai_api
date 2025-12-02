# Apple Sign-In & Apple Pay (Stripe) Integration

This document explains the changes added to support Apple Sign-In and how to enable Apple Pay via Stripe Checkout.

## Backend changes
- Added fields to Prisma `User` model: `appleId` and `appleEmail`.
- Added `src/services/apple.service.ts` using `apple-signin-auth` to verify Apple identity tokens.
- Added `auth` route `/api/auth/apple` implemented in `src/routes/auth.routes.ts` -> `src/controllers/auth.controller.ts` -> `src/services/auth.service.ts`.

## Environment variables
Add the following to your `.env` for Apple Sign-In (only `APPLE_CLIENT_ID` is required for verification of identity tokens):

- `APPLE_CLIENT_ID` (Service ID / client id you registered in Apple Developer)
- `APPLE_TEAM_ID` (optional, used to generate client secret)
- `APPLE_KEY_ID` (optional)
- `APPLE_PRIVATE_KEY` (optional, the private key content for generating client secret)

Stripe-related variables (already expected by the project):

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Apple Sign-In flow (client -> server)
1. Client obtains an Apple `identityToken` using the platform SDK (e.g., `expo-apple-authentication` on iOS).
2. Client sends `{ identityToken }` to `POST /api/auth/apple`.
3. Server verifies the token with Apple and either finds or creates a `User` with `appleId`.
4. Server issues access & refresh JWT tokens and returns user info.

## Apple Pay with Stripe
- This project uses Stripe Checkout for subscriptions and payments. Stripe Checkout will surface Apple Pay automatically on supported iOS devices and configured domains.
- To enable Apple Pay in Stripe and for your domain (or custom app), follow Stripe's docs:
  - Register an Apple Merchant ID in Apple Developer
  - Configure Apple Pay in Stripe Dashboard -> Settings -> Apple Pay
  - Add the verification file to your site or follow Stripe instructions to verify your domain

Notes about mobile in-app Apple Pay:
- To present an in-app Apple Pay sheet with `stripe-react-native`, your app must include native Stripe SDK and Apple merchant configuration. In Expo managed workflow, that requires EAS build with native modules (not included automatically). For now, we rely on Stripe Checkout opened in an external browser/webview which supports Apple Pay when available.

## Migrations
- After pulling changes, run Prisma migrate to update schema:

```
cd ivyway_ai_api
pnpm install # or npm install
npx prisma migrate dev --name add_apple_fields
```

## Backend dependencies added
- `apple-signin-auth`

## Frontend changes
- Added `expo-apple-authentication` usage in the login screen to obtain identity token and exchange it with backend.
- The app still uses Stripe Checkout sessions; Apple Pay will be available on devices/browsers that support it and when Stripe is configured.

## Testing
- iOS Simulator: Apple Sign-In button is not available on simulator; test on a real iOS device.
- For Apple Pay via Checkout, test on a real iOS device with Apple Pay set up and a verified domain in Stripe.

If you want, I can continue by wiring a PaymentIntent endpoint for direct Apple Pay in-app flows and scaffolding a `stripe-react-native` integration (requires EAS/native build). Let me know which option you prefer.
