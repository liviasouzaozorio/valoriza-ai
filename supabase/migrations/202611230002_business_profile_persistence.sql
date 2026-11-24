-- Campos complementares do perfil do negócio. Não altera registros existentes.
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS target_margin_percent NUMERIC,
    ADD COLUMN IF NOT EXISTS additional_data JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'businesses_target_margin_percent_check'
          AND conrelid = 'public.businesses'::regclass
    ) THEN
        ALTER TABLE public.businesses
            ADD CONSTRAINT businesses_target_margin_percent_check
            CHECK (
                target_margin_percent IS NULL
                OR (target_margin_percent >= 0 AND target_margin_percent < 100)
            );
    END IF;
END
$$;

COMMENT ON COLUMN public.businesses.target_margin_percent IS
    'Meta de margem definida pelo empreendedor; NULL significa que ainda não foi informada.';
COMMENT ON COLUMN public.businesses.additional_data IS
    'Informações complementares do perfil do negócio, sem substituir os campos principais.';
