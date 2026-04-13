# Admin Panel — Design Spec

**Date:** 2026-04-13
**Status:** APPROVED

## Overview
Admin page at `/app/admin` visible only to users with `is_admin = true`. Allows Pedro to manage user plans (promote/demote) without Stripe. Lists all users with plan info.

## Database
- Add `is_admin boolean DEFAULT false` to `profiles` table
- Set Pedro's profile to `is_admin = true`
- Plan changes go directly to `subscriptions` table (no Stripe)

## Page: /app/admin
- Search by email field
- User card: name, email, current plan, actions
- Full user list: table with name, email, plan, joined date
- Actions: Promote to Mentor/Pro/Ultra, Demote to Free

## API Routes
- GET /api/admin/users — list all users (admin only)
- POST /api/admin/promote — change user plan (admin only)
- Both verify is_admin before executing

## Security
- is_admin check on every admin API route
- Admin nav link only shown when is_admin = true
- No Stripe involved — direct DB updates
