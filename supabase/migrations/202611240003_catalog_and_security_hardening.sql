-- Catalog persistence and database hardening.
-- Additive schema changes only; legacy pricing rows are intentionally left untouched.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS additional_data JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_business_id_id_key'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_business_id_id_key UNIQUE (business_id, id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'precificacoes_business_product_same_owner_fkey'
      AND conrelid = 'public.precificacoes'::regclass
  ) THEN
    ALTER TABLE public.precificacoes
      ADD CONSTRAINT precificacoes_business_product_same_owner_fkey
      FOREIGN KEY (business_id, product_id)
      REFERENCES public.products (business_id, id)
      NOT VALID;
  END IF;
END
$$;

-- Index missing FK lookups identified by Supabase advisors.
CREATE INDEX IF NOT EXISTS idx_nilo_messages_precificacao
  ON public.nilo_messages (precificacao_id)
  WHERE precificacao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recomendacoes_ia_precificacao
  ON public.recomendacoes_ia (precificacao_id)
  WHERE precificacao_id IS NOT NULL;

-- Avoid repeated auth.uid() evaluation for every preference row.
DROP POLICY IF EXISTS "Users can read their own preferences" ON public.user_preferences;
CREATE POLICY "Users can read their own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- These privileges are not filtered by RLS and are not required by the app.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.businesses, public.products, public.precificacoes,
            public.recomendacoes_ia, public.nilo_conversations, public.nilo_messages
  FROM anon, authenticated;

COMMENT ON COLUMN public.products.additional_data IS
  'Metadados complementares do item, como subtipo exibido na interface.';
