ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS water_ml integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sleep_hours numeric(3,1),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS mood smallint,
  ADD COLUMN IF NOT EXISTS steps integer NOT NULL DEFAULT 0;