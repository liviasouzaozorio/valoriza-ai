# Configuração do cadastro e login do ValorizAI

Esta etapa usa o Supabase Auth no navegador. O arquivo `public/auth-config.js` contém somente configuração pública.

## 1. Configurar a chave pública

Abra `public/auth-config.js` e substitua:

```js
supabaseAnonKey: 'sb_publishable_s3GhLyuyfkSj7YgEV9auWw_XBnlZY9_'
```

pela **publishable key** (ou anon key legada) do projeto Supabase.

- É esperado que essa chave pública seja utilizada no navegador.
- Nunca coloque `service_role`, senha do banco, `GEMINI_API_KEY`, JWT de usuário ou qualquer segredo nesse arquivo.
- As tabelas precisam continuar protegidas por RLS.

## 2. Desativar confirmação de e-mail

No painel Supabase, abra as configurações de Authentication e desative a confirmação de e-mail para novos usuários. O cadastro foi desenhado para iniciar uma sessão imediatamente, sem etapa de confirmação.

A aplicação não implementa recuperação de senha, conforme o escopo atual do MVP.

## 3. URLs de redirecionamento

Em Authentication > URL Configuration, configure a URL principal do ambiente em que a aplicação será executada e permita os redirecionamentos desse ambiente. Em desenvolvimento local, use a origem local correta do projeto (por exemplo, `http://localhost:3000` se esse for o endereço utilizado).

## 4. Tabelas e políticas necessárias

O cadastro cria o usuário pelo Supabase Auth e, em seguida, cria uma linha em `public.businesses` com:

- `owner_user_id`: UUID do usuário autenticado;
- `name`: nome da empresa informado no cadastro;
- `sector`: `comercio`, `industria` ou `servicos`.

A tabela `businesses` precisa permitir INSERT e SELECT para o usuário autenticado somente quando `owner_user_id = auth.uid()`. A restrição UNIQUE em `owner_user_id` mantém o modelo atual de uma empresa por usuário.

## 5. Teste manual após configurar

1. Abra `/auth.html`.
2. Crie uma conta com nome, empresa, segmento, e-mail e senha de pelo menos 8 caracteres.
3. Confirme que o Supabase cria a sessão sem pedir confirmação de e-mail.
4. Confirme que a linha da empresa foi criada em `businesses`.
5. Saia da conta pelo sistema (o logout do painel será integrado na próxima etapa) ou encerre a sessão pelo painel Supabase durante os testes.
6. Faça login com e-mail e senha.
7. Abra `/index.html` sem sessão e confirme que a aplicação redireciona para `/auth.html`.

## Limite desta entrega

O guard protege a entrada da interface. Ele **não substitui a autenticação e autorização das rotas de backend**. Antes de liberar operações de dados e o Nilo, o servidor deverá validar o access token em cada rota protegida e garantir isolamento por usuário/RLS. Essa integração será feita na próxima etapa.
