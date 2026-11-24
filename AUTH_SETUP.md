# Configuração do cadastro, login e perfil do ValorizAI

O Supabase Auth gerencia a identidade e a sessão no navegador. A persistência do perfil do negócio é realizada pelo backend Node.js, que valida o token e usa a conexão PostgreSQL do servidor.

## 1. Configuração pública do Supabase

O arquivo `public/auth-config.js` contém somente a URL e a publishable/anon key do projeto Supabase.

- A chave pública pode ser utilizada no navegador.
- Nunca coloque `service_role`, senha do banco, `GEMINI_API_KEY`, JWT de usuário ou `DATABASE_URL` nesse arquivo.

## 2. Configuração do servidor

Configure no ambiente do servidor, sem versionar o arquivo `.env`:

- `SUPABASE_URL`: URL do mesmo projeto Supabase usado pelo frontend.
- `SUPABASE_ANON_KEY` ou `SUPABASE_PUBLISHABLE_KEY`: chave pública utilizada para validar a sessão com Supabase Auth.
- `DATABASE_URL`: conexão PostgreSQL do projeto.
- `DB_SSL` e parâmetros TLS necessários ao ambiente.
- `GEMINI_API_KEY`: chave do serviço de IA, exclusivamente no servidor.

A conexão PostgreSQL do backend pode possuir privilégios elevados e, por isso, as rotas privadas validam a sessão e incluem a propriedade do usuário nas consultas. Não confie em `owner_user_id` ou `business_id` enviados pelo navegador.

## 3. Confirmação de e-mail

O fluxo suporta os dois cenários:

- Se o Supabase criar uma sessão imediatamente, o cadastro prepara o negócio pela API.
- Se a confirmação de e-mail estiver habilitada e não houver sessão, a pessoa conclui a confirmação e o primeiro login prepara o negócio.

A aplicação não implementa recuperação de senha nesta etapa.

## 4. Migration do perfil

A migration `supabase/migrations/202611230002_business_profile_persistence.sql` adiciona:

- `target_margin_percent`: meta opcional de margem, inicialmente `NULL`.
- `additional_data`: informações complementares em JSONB.

**A migration não é executada automaticamente pela aplicação.** Antes de aplicá-la, confirme que o projeto Supabase e o schema são os esperados e faça backup adequado. Não execute a migration em produção sem conferir o tipo real de `currency_code` e o estado atual das colunas/constraints.

A migration anterior `202611230001_user_preferences.sql` cria a tabela de preferências da navegação. Confirme também se ela já foi aplicada no ambiente correto.

## 5. Contratos de perfil

Após autenticação, o frontend chama:

- `POST /api/business/ensure`: cria o negócio uma única vez ou recupera o já existente.
- `GET /api/business/profile`: recupera o perfil do usuário autenticado.
- `PATCH /api/business/profile`: atualiza somente os campos enviados.

A API deriva a identidade do token validado. O cliente não escolhe o proprietário. Campos omitidos são preservados; `target_margin_percent: null` remove a meta; propriedades omitidas de `additional_data` permanecem inalteradas.

O segmento `servico` utilizado na interface é normalizado para `servicos` no banco.

## 6. Teste manual após configuração

1. Confirme que as variáveis do servidor apontam para o mesmo projeto Supabase do frontend.
2. Aplique as migrations somente após revisar o schema e autorizar a execução.
3. Abra `/auth.html` e crie uma conta.
4. Se a confirmação de e-mail estiver habilitada, conclua essa etapa e faça login.
5. Confirme que existe somente um negócio associado ao usuário em `businesses`.
6. Abra Meu negócio, altere o perfil e salve.
7. Faça logout e login novamente; confirme que o perfil é recuperado do banco.
8. Confirme que uma segunda conta não consegue consultar ou alterar o perfil da primeira.
9. Abra `/index.html` sem sessão e confirme o redirecionamento para `/auth.html`.

## 7. Limites desta entrega

A Entrega 1 integra somente autenticação, criação/recuperação do negócio, perfil e workspace local individualizado. Catálogo, precificações, histórico do Nilo, importação do backup legado e dashboards continuam fora do escopo.

A chave antiga `valorizai_workspace_v1` é preservada como backup independente e não é importada automaticamente para nenhuma conta.

A rota `/perguntar` ainda precisa receber autenticação obrigatória e validação de propriedade antes da integração do histórico do Nilo com o banco.
