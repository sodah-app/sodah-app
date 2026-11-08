-- Run in the Supabase SQL Editor before deploying the updated subscription page/API.
-- Records whether this business has ever claimed its one-time free trial.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trial_used_at timestamptz;

-- Optional: if you have existing trial businesses, mark them as already used so
-- they cannot claim a second trial after this migration.
UPDATE public.businesses
SET trial_used_at = COALESCE(trial_used_at, subscription_start, now())
WHERE lower(COALESCE(subscription_plan, '')) LIKE '%trial%';
