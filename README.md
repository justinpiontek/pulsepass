# LinxPass

LinxPass is the production app foundation for the digital contact-card and event-page product you have been shaping in this repo.

This workspace now contains two layers:

- The original static prototype files such as `businesscards.html` and `dashboard.html`
- A new Next.js app with real auth, billing, publishing, and database foundations

## What the real app covers

- Marketing homepage
- Self-serve signup for `Starter` and `Pro`
- Enterprise contact-sales flow
- Supabase auth foundation
- Password reset flow
- Stripe Checkout session endpoint
- Optional Stripe Payment Link redirect support
- Stripe webhook foundation
- Database-backed dashboard
- Public contact pages by slug
- Public event pages by slug
- Google Wallet pass generation for contact QR
- RSVP persistence

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth + Postgres
- Stripe Checkout + webhooks

## Setup

1. Copy `.env.example` to `.env`
2. Create a Supabase project
3. Run the SQL in `supabase/migrations/202604040001_init.sql`
4. Run the later SQL migrations too, including `supabase/migrations/202604060001_profile_socials_and_photos.sql`
5. Create Stripe products and recurring prices for Starter and Pro
6. Add the Stripe price IDs and webhook secret to `.env`
7. Optional: add `STRIPE_STARTER_PAYMENT_LINK_URL` and `STRIPE_PRO_PAYMENT_LINK_URL` if you want Stripe-hosted Payment Links instead of creating Checkout Sessions in-app
8. If you use Payment Links, configure promotion codes, collected names, and the post-payment redirect inside Stripe
9. Add Google Wallet issuer credentials if you want Android "Add to Wallet"
10. Install dependencies with `npm install`
11. Start the app with `npm run dev`

## Suggested launch order

1. Wire Supabase
2. Verify signup and sign-in
3. Verify Stripe Checkout and webhook delivery
4. Create a contact page in the dashboard
5. Publish an event page
6. Point your domain at the Next.js app

## Notes

- Enterprise uses a contact-sales flow instead of self-serve checkout
- Google Wallet can be generated in-app when issuer credentials are configured
- Apple Wallet still needs a signed `.pkpass` URL or pass service
- Stripe Payment Links can collect full name and business name, allow promotion codes, and still activate LinxPass accounts through the webhook when the link includes `client_reference_id`
- Profile photos upload to the public `profile-photos` Supabase Storage bucket created by the photo migration
- The current webhook handler is production-shaped, but you still need live Stripe price IDs and webhook forwarding before billing goes end-to-end
