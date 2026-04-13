# Mentor Access System — Design Spec

**Date:** 2026-04-13
**Status:** APPROVED

## Overview
Mentors pay for a dedicated plan, get full site access + a `/app/mentor` dashboard to view student performance, add notes/ratings, and send guidance. Students link via invite code and can revoke access anytime.

## Pricing Tiers
| Tier | Price/mo | Max Students |
|------|----------|-------------|
| mentor_50 | R$50 | 50 |
| mentor_100 | R$100 | 100 |
| mentor_200 | R$200 | 200 |

Mentor plan = full Ultra access + mentor features.

## Invite Code Flow
1. Mentor generates a unique code (e.g. `MENTOR-A3X9`) from `/app/mentor`
2. Student enters code in Settings → "Vincular Mentor"
3. Code is **case-insensitive** (UPPER comparison)
4. Relationship created as `active`
5. Pedro does nothing — fully self-service

## Database Tables

### mentor_relationships
- id: uuid PK
- mentor_id: uuid FK auth.users
- student_id: uuid FK auth.users (nullable until claimed)
- invite_code: text UNIQUE
- status: 'active' | 'revoked' | 'pending'
- created_at: timestamptz
- revoked_at: timestamptz nullable

### mentor_notes
- id: uuid PK
- relationship_id: uuid FK mentor_relationships
- mentor_id: uuid FK auth.users
- student_id: uuid FK auth.users
- trade_id: uuid FK journal_trades nullable
- note_date: date nullable
- content: text
- rating: smallint nullable (1-5)
- created_at: timestamptz
- updated_at: timestamptz

## RLS Policies
- Mentor reads relationships where mentor_id = auth.uid() AND status = 'active'
- Student reads relationships where student_id = auth.uid()
- Student can UPDATE status to 'revoked' on own relationships
- Mentor reads student journal_trades only via API (server-side verification)
- Mentor CRUD on mentor_notes where mentor_id = auth.uid()
- Student reads mentor_notes where student_id = auth.uid()

## API Routes
- POST /api/mentor/generate-code — mentor generates invite code
- POST /api/mentor/link — student submits code, creates link
- DELETE /api/mentor/link — student revokes
- GET /api/mentor/students — mentor lists students
- GET /api/mentor/student/[id]/journal — mentor views student journal data
- GET /api/mentor/student/[id]/kpis — mentor views student KPIs
- POST /api/mentor/notes — mentor creates note
- GET /api/mentor/notes/[studentId] — get notes for student
- DELETE /api/mentor/notes/[noteId] — mentor deletes own note
- GET /api/mentor/my-mentor — student gets their mentor info

## Frontend Pages
- `/app/mentor` — mentor dashboard (student list + detail view)
- Settings page — student section to link/revoke mentor

## Badge
- "Mentor" badge in sidebar, settings, and profile
- Amber/gold color scheme to differentiate from Pro/Ultra

## Loading Safety
- ALL data fetching has 8s safety timeout → fallback to empty state
- No infinite spinners — always resolve to content or error
- Optimistic UI where possible
