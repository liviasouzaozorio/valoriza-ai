(() => {
  'use strict';
  document.documentElement.classList.add('auth-checking');

  const config = window.VALORIZAI_CONFIG || {};
  const configured = Boolean(
    window.supabase?.createClient &&
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseAnonKey.includes('COLE_AQUI')
  );

  if (!configured) {
    window.location.replace('/auth.html?setup=1');
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      window.location.replace('/auth.html');
      return;
    }
    document.documentElement.classList.remove('auth-checking');
  }).catch(() => window.location.replace('/auth.html'));
})();
