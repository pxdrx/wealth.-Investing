-- Re-dispatch mentor onboarding for all current mentor subscribers.
-- Safe: only clears the completion timestamp. MentorOnboardingModal will
-- restore it via /api/profile/mentor-onboarded when the user completes again.
UPDATE public.profiles
SET mentor_onboarded_at = NULL
WHERE mentor_onboarded_at IS NOT NULL
  AND id IN (
    SELECT user_id
    FROM public.subscriptions
    WHERE plan = 'mentor'
      AND status IN ('active', 'trialing')
  );
