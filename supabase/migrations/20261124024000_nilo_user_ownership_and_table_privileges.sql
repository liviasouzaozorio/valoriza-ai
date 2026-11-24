-- Nilo: ownership by authenticated user, optional business context, and least-privilege table grants.
BEGIN;

ALTER TABLE public.nilo_conversations
  ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill existing conversations from their current business owner.
UPDATE public.nilo_conversations AS c
SET owner_user_id = b.owner_user_id
FROM public.businesses AS b
WHERE b.id = c.business_id
  AND c.owner_user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.nilo_conversations
    WHERE owner_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Não foi possível determinar o proprietário de todas as conversas do Nilo.';
  END IF;
END
$$;

ALTER TABLE public.nilo_conversations
  ALTER COLUMN owner_user_id SET NOT NULL,
  ALTER COLUMN business_id DROP NOT NULL;

ALTER TABLE public.nilo_conversations
  DROP CONSTRAINT IF EXISTS nilo_conversations_business_id_fkey;

ALTER TABLE public.nilo_conversations
  ADD CONSTRAINT nilo_conversations_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilo_conversations_owner_user_id_fkey'
      AND conrelid = 'public.nilo_conversations'::regclass
  ) THEN
    ALTER TABLE public.nilo_conversations
      ADD CONSTRAINT nilo_conversations_owner_user_id_fkey
      FOREIGN KEY (owner_user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_nilo_conversations_owner_updated
  ON public.nilo_conversations (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_nilo_messages_conversation_created
  ON public.nilo_messages (conversation_id, created_at, id);

DROP POLICY IF EXISTS nilo_conversations_owner_all ON public.nilo_conversations;
CREATE POLICY nilo_conversations_owner_all
  ON public.nilo_conversations
  FOR ALL
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS nilo_messages_owner_all ON public.nilo_messages;
CREATE POLICY nilo_messages_owner_all
  ON public.nilo_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.nilo_conversations AS c
      WHERE c.id = nilo_messages.conversation_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.nilo_conversations AS c
      WHERE c.id = nilo_messages.conversation_id
        AND c.owner_user_id = (SELECT auth.uid())
        AND (
          nilo_messages.precificacao_id IS NULL
          OR (
            c.business_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.precificacoes AS p
              WHERE p.id = nilo_messages.precificacao_id
                AND p.business_id = c.business_id
            )
          )
        )
    )
  );

-- No browser client needs anonymous table access; the backend authenticates and scopes
-- privileged PostgreSQL queries explicitly. Keep authenticated RLS access as defense in depth.
REVOKE ALL ON TABLE
  public.businesses,
  public.products,
  public.precificacoes,
  public.recomendacoes_ia,
  public.nilo_conversations,
  public.nilo_messages,
  public.user_preferences
FROM anon;

-- Prevent table-level capabilities that bypass row-level policies or are unnecessary.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.businesses,
  public.products,
  public.precificacoes,
  public.recomendacoes_ia,
  public.nilo_conversations,
  public.nilo_messages,
  public.user_preferences
FROM authenticated;

-- Preferences do not need deletion from the client; recommendation writes remain backend-only.
REVOKE DELETE ON TABLE public.user_preferences FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.recomendacoes_ia FROM authenticated;
GRANT SELECT ON TABLE public.recomendacoes_ia TO authenticated;

COMMIT;
