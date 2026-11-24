-- Índice de cobertura da FK composta (business_id, product_id).
CREATE INDEX IF NOT EXISTS idx_precificacoes_business_product
  ON public.precificacoes (business_id, product_id);
