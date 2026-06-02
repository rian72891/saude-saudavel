-- Tabela para monitoramento diário de saúde (glicose + refeições)
CREATE TABLE public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  glucose_mg_dl NUMERIC,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories INTEGER NOT NULL DEFAULT 0,
  ai_insight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_logs TO authenticated;
GRANT ALL ON public.health_logs TO service_role;

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_logs_own_all"
ON public.health_logs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_health_logs
BEFORE UPDATE ON public.health_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_health_logs_user_date ON public.health_logs (user_id, log_date DESC);