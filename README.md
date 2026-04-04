# PulsePass

PulsePass is the production app foundation for the digital contact-card and event-page product you have been shaping in this repo.

This workspace now contains two layers:

- The original static prototype files such as `businesscards.html` and `dashboard.html`
- A new Next.js app with real auth, billing, publishing, and database foundations

## What the real app covers

- Marketing homepage
- Self-serve signup for `Starter` and `Pro`
- Enterprise contact-sales flow
- Supabase auth foundation
- Stripe Checkout session endpoint
- Stripe webhook foundation
- Database-backed dashboard
- Public contact pages by slug
- Public event pages by slug
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
4. Create Stripe products and recurring prices for Starter and Pro
5. Add the Stripe price IDs and webhook secret to `.env`
6. Install dependencies with `npm install`
7. Start the app with `npm run dev`

## Suggested launch order

1. Wire Supabase
2. Verify signup and sign-in
3. Verify Stripe Checkout and webhook delivery
4. Create a contact page in the dashboard
5. Publish an event page
6. Point your domain at the Next.js app

## Notes

- Enterprise uses a contact-sales flow instead of self-serve checkout
- Wallet links are stored on the profile so you can attach Apple Wallet and Google Wallet URLs later
- The current webhook handler is production-shaped, but you still need live Stripe price IDs and webhook forwarding before billing goes end-to-end
