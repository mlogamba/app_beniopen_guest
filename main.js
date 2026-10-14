/* Acceso: entrar, crear cuenta, recuperar contraseña */
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var mode = 'login', resetToken = null;

  function msg(text, ok){
    var n = $('auth-msg');
    n.textContent = text || '';
    n.className = 'auth-msg' + (text ? (ok ? ' ok' : ' err') : '');
  }
  function errText(e){ return (e && e.message) || String(e); }

  function setMode(m){
    mode = m;
    document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.mode === m); });
    $('f-name-wrap').style.display = m === 'signup' ? '' : 'none';
    $('f-pass-wrap').style.display = m === 'recover' ? 'none' : '';
    $('f-email').closest('form').querySelector('label[for=f-email]').style.display = m === 'newpass' ? 'none' : '';
    $('f-email').style.display = m === 'newpass' ? 'none' : '';
    $('f-email').required = m !== 'newpass';
    $('f-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('auth-forgot').style.display = m === 'login' ? '' : 'none';
    $('auth-submit').textContent = {login:'Entrar', signup:'Crear cuenta y empezar', recover:'Enviar enlace de recuperación', newpass:'Guardar nueva contraseña'}[m];
    msg('');
  }

  function signedOut(){
    document.body.classList.remove('booting', 'signed-in');
    document.body.classList.add('signed-out');
  }

  async function loadMe(){
    if(!Core.token()) return null;
    try{ return await Core.call('me'); }
    catch(e){ if(e.status === 401){ Core.setToken(null); return null; } throw e; }
  }

  async function enter(){
    var me = await loadMe();
    if(me){
      document.body.classList.remove('booting', 'signed-out');
      document.body.classList.add('signed-in');
      window.bootApp(me);
    }else{
      signedOut();
      msg('Tu sesión ha caducado: vuelve a entrar.');
    }
  }

  async function submit(){
    var btn = $('auth-submit'), email = $('f-email').value.trim(), pass = $('f-pass').value, d;
    btn.disabled = true;
    try{
      if(mode === 'login'){
        d = await Core.call('auth/login', 'POST', {email: email, password: pass}, true);
        Core.setToken(d.token); await enter();
      }else if(mode === 'signup'){
        d = await Core.call('auth/signup', 'POST', {email: email, password: pass, name: $('f-name').value.trim()}, true);
        Core.setToken(d.token); await enter();
      }else if(mode === 'recover'){
        await Core.call('auth/recover', 'POST', {email: email}, true);
        msg('Si el email existe, recibirás un enlace para crear una nueva contraseña.', true);
      }else if(mode === 'newpass'){
        d = await Core.call('auth/reset', 'POST', {token: resetToken, password: pass}, true);
        Core.setToken(d.token); resetToken = null;
        history.replaceState(null, '', location.pathname);
        await enter();
      }
    }catch(e){ msg(errText(e)); }
    finally{ btn.disabled = false; }
  }

  window.Auth = {
    mode: setMode,
    submit: submit,
    token: async function(){ return Core.token(); },
    logout: async function(){ Core.setToken(null); location.href = location.pathname; }
  };

  async function boot(){
    Core.call('public-settings', 'GET', null, true).then(function(e){
      window.APP_PUBLIC = e;
      if(typeof APP_SETTINGS === 'object' && !APP_SETTINGS.donationUrl) APP_SETTINGS.donationUrl = e.donationUrl;
      if(e.trialDays){
        $('trial-note').textContent = 'Prueba gratis ' + e.trialDays + ' días. Después, ' +
          Number(e.monthlyPrice).toLocaleString('es-ES', {style:'currency', currency: e.currency || 'EUR'}) + ' al mes.';
      }
    }).catch(function(){});

    var rt = new URLSearchParams(location.search).get('reset');
    if(rt){
      resetToken = rt; signedOut(); setMode('newpass'); msg('Escribe tu nueva contraseña.', true);
      return;
    }
    if(Core.token()){
      try{ await enter(); }
      catch(e){ signedOut(); msg(errText(e)); }
    }else{
      signedOut();
    }
  }
  boot();
})();
