(() => {
  'use strict';

  const config = window.VALORIZAI_CONFIG || {};
  const setupMessage = document.getElementById('auth-setup-message');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const configured = Boolean(
    window.supabase?.createClient &&
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseAnonKey.includes('COLE_AQUI')
  );

  if (!configured) {
    setupMessage.hidden = false;
    loginForm.querySelector('button[type="submit"]').disabled = true;
    registerForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function feedback(id, message, success = false) {
    const node = document.getElementById(id);
    node.textContent = message || '';
    node.style.color = success ? '#147D52' : '';
  }

  function switchView(view) {
    const register = view === 'register';
    loginPanel.hidden = register;
    registerPanel.hidden = !register;
    feedback('login-feedback', '');
    feedback('register-feedback', '');
    (register ? document.getElementById('register-name') : document.getElementById('login-email')).focus();
  }

  document.querySelectorAll('[data-auth-view]').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.authView));
  });

  async function ensureBusiness(user, metadata = user.user_metadata || {}) {
    const { data: existing, error: readError } = await client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing;

    const business = {
      owner_user_id: user.id,
      name: metadata.company_name || 'Meu negócio',
      sector: metadata.sector || 'comercio'
    };
    const { data, error } = await client.from('businesses').insert(business).select('id').single();
    if (error) throw error;
    return data;
  }

  function friendlyError(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (message.includes('user already registered')) return 'Este e-mail já possui uma conta. Faça login.';
    if (message.includes('password')) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (message.includes('email')) return 'Confira se o e-mail foi preenchido corretamente.';
    return 'Não foi possível concluir. Confira os dados e tente novamente.';
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    feedback('login-feedback', '');
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Entrando…';

    try {
      const form = new FormData(loginForm);
      const { data, error } = await client.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password'))
      });
      if (error) throw error;
      await ensureBusiness(data.user);
      window.location.replace('/index.html');
    } catch (error) {
      feedback('login-feedback', friendlyError(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Entrar';
    }
  });

  registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    feedback('register-feedback', '');
    const button = registerForm.querySelector('button[type="submit"]');
    const form = new FormData(registerForm);
    const name = String(form.get('name')).trim();
    const company = String(form.get('company')).trim();
    const sector = String(form.get('sector'));
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));

    if (!name || !company || !sector || !email || password.length < 8) {
      feedback('register-feedback', 'Preencha todos os campos. A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Criando conta…';

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, company_name: company, sector } }
      });
      if (error) throw error;

      if (!data.session || !data.user) {
        feedback('register-feedback', 'A conta foi recebida, mas o Supabase não iniciou uma sessão. Para este MVP, desative a confirmação de e-mail nas configurações de autenticação e tente novamente.');
        return;
      }

      await ensureBusiness(data.user, { full_name: name, company_name: company, sector });

      // O cadastro termina na tela de login: a pessoa entra usando as credenciais recém-criadas.
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;

      switchView('login');
      feedback('login-feedback', 'Conta criada com sucesso! Agora entre com seu e-mail e senha.', true);
    } catch (error) {
      feedback('register-feedback', friendlyError(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Criar minha conta';
    }
  });

  client.auth.getSession().then(({ data }) => {
    if (data.session) window.location.replace('/index.html');
  }).catch(() => {});
})();
