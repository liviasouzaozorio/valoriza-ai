(() => {
  'use strict';

  const button = document.getElementById('logout-btn');
  const config = window.VALORIZAI_CONFIG || {};

  if (!button || !window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  button.addEventListener('click', async () => {
    button.disabled = true;
    const label = button.querySelector('.nav-label');
    if (label) label.textContent = 'Saindo…';

    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      window.location.replace('/auth.html?logout=1');
    } catch (error) {
      button.disabled = false;
      if (label) label.textContent = 'Sair';
      window.alert('Não foi possível encerrar a sessão. Tente novamente.');
      console.error('Erro ao sair do ValorizAI:', error);
    }
  });
})();