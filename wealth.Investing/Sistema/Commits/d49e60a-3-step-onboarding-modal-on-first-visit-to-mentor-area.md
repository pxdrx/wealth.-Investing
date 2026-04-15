---
type: commit
sha: d49e60a84524842859498a234c041cd6fc1d2928
sha7: d49e60a
date: "2026-04-14T16:45:01-03:00"
author: Pedro
commit_type: feat
scope: mentor
files_changed: 4
insertions: 254
deletions: 5
tags: ["feat", "mentor", "api", "route", "ui"]
---

# feat(mentor): 3-step onboarding modal on first visit to mentor area

> Commit por **Pedro** em 2026-04-14T16:45:01-03:00
> 4 arquivo(s) — +254 / −5

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/profile/mentor-onboarded/route.ts|app/api/profile/mentor-onboarded/route.ts]]
- [[Sistema/Rotas/app/app/mentor/page.tsx|app/app/mentor/page.tsx]]
- `components/mentor/MentorOnboardingModal.tsx` [[Sistema/Arquivos/components/mentor/MentorOnboardingModal.tsx|hub]]
- `supabase/migrations/20260414_profile_mentor_onboarded.sql` [[Sistema/Arquivos/supabase/migrations/20260414_profile_mentor_onboarded.sql|hub]]

## Mensagem

Newly-promoted mentors had no contextual intro to the mentor tab. Now on
first navigation to /app/mentor, a 3-slide modal explains: welcome,
generating invite codes, tracking students. Completion persisted in
profiles.mentor_onboarded_at so it never repeats.

Guard: !subscription.isLoading && isMentor && mentor_onboarded_at === null
(prevents flicker during live promotion).

Migration NOT yet applied to remote DB — needs supabase db push.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
