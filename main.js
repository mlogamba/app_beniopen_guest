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

  /* =====================================================================
     ONBOARDING BENIOPEN — se muestra solo al crear una cuenta nueva
     ===================================================================== */
  var _boDataOnboard = null;

  function escHtmlOb(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function showOnboardingModal(me){
    var overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99998;',
      'background:var(--court-dark,#0f5a4d);',
      'overflow-y:auto;display:flex;',
      'align-items:flex-start;justify-content:center;',
      'padding:20px 16px 40px;'
    ].join('');

    overlay.innerHTML =
      '<div style="max-width:480px;width:100%;margin:auto;">' +

      /* Cabecera */
      '<div style="text-align:center;padding:24px 0 20px;">' +
        '<div style="font-size:48px;line-height:1;">🎾</div>' +
        '<h1 style="color:#fff;font-size:24px;margin:12px 0 6px;">¡Bienvenido a Mi Liguilla!</h1>' +
        '<p style="color:rgba(255,255,255,0.82);font-size:15px;margin:0;">Tu liguilla de tenis en el bolsillo</p>' +
      '</div>' +

      /* Guía rápida de la app */
      '<div style="background:rgba(255,255,255,0.10);border-radius:18px;padding:18px 20px;margin-bottom:18px;">' +
        '<h3 style="color:#ffe066;margin:0 0 10px;font-size:15px;">📖 ¿Qué puedes hacer con esta app?</h3>' +
        '<ul style="color:rgba(255,255,255,0.90);margin:0;padding-left:18px;font-size:13.5px;line-height:1.75;">' +
          '<li><b>📅 Calendario</b> — Organiza y programa tus partidos con fecha, hora y pista.</li>' +
          '<li><b>📋 Partidas</b> — Registra resultados (sets, WO) y lleva el historial.</li>' +
          '<li><b>✉️ Invitar</b> — Genera mensajes y envíalos por <b>WhatsApp</b> a tus rivales.</li>' +
          '<li><b>📊 Clasificación</b> — Consulta la tabla oficial del Beniopen sin salir de la app.</li>' +
          '<li><b>🔒 Notas privadas</b> — Apunta tácticas sobre cada rival (solo las ves tú).</li>' +
          '<li><b>☁️ Nube</b> — Todo sincronizado en todos tus dispositivos.</li>' +
        '</ul>' +
      '</div>' +

      /* PASO 1: ¿Juegas el Beniopen? */
      '<div id="ob-step1" style="background:#fff;border-radius:18px;padding:22px 20px;">' +
        '<h3 style="margin:0 0 8px;color:#0f5a4d;font-size:17px;">¿Juegas en el Beniopen de Valencia?</h3>' +
        '<p style="color:#555;font-size:14px;margin:0 0 18px;">Si es así, podemos configurar tu liguilla automáticamente descargando los jugadores de tu grupo directamente de beniopen.es.</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
          '<button id="ob-yes" style="background:#0f5a4d;color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;">✅ Sí, juego el Beniopen</button>' +
          '<button id="ob-no" style="background:#f0f0f0;color:#333;border:none;border-radius:12px;padding:13px;font-size:15px;cursor:pointer;">No, lo configuraré manualmente</button>' +
        '</div>' +
      '</div>' +

      /* PASO 2: ¿En qué grupo? */
      '<div id="ob-step2" style="background:#fff;border-radius:18px;padding:22px 20px;display:none;">' +
        '<h3 style="margin:0 0 8px;color:#0f5a4d;font-size:17px;">¿En qué grupo juegas?</h3>' +
        '<p id="ob-load-msg" style="color:#777;font-size:14px;margin:0 0 14px;">Descargando los grupos de beniopen.es… ⏳</p>' +
        '<select id="ob-group-sel" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid #ddd;font-size:15px;display:none;" onchange="window._obGroupChanged()"><option value="">— Elige tu grupo —</option></select>' +
        '<div id="ob-err" style="color:#c00;font-size:13px;margin-top:8px;display:none;"></div>' +
        '<div style="display:flex;gap:10px;margin-top:14px;">' +
          '<button id="ob-group-next" onclick="window._obGroupNext()" style="flex:1;background:#0f5a4d;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;display:none;">Siguiente →</button>' +
          '<button onclick="window._obSkip()" style="flex:1;background:#f0f0f0;color:#555;border:none;border-radius:12px;padding:13px;font-size:14px;cursor:pointer;">Lo haré a mano</button>' +
        '</div>' +
      '</div>' +

      /* PASO 3: ¿Quién eres? */
      '<div id="ob-step3" style="background:#fff;border-radius:18px;padding:22px 20px;display:none;">' +
        '<h3 style="margin:0 0 6px;color:#0f5a4d;font-size:17px;">¿Quién eres en tu grupo?</h3>' +
        '<p id="ob-group-label" style="color:#0f5a4d;font-size:14px;font-weight:700;margin:0 0 14px;"></p>' +
        '<select id="ob-player-sel" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid #ddd;font-size:15px;" onchange="window._obPlayerChanged()"><option value="">— Selecciona tu nombre —</option></select>' +
        '<p id="ob-preview-txt" style="color:#555;font-size:13px;margin:12px 0 0;"></p>' +
        '<div style="display:flex;gap:10px;margin-top:14px;">' +
          '<button id="ob-import-btn" onclick="window._obImport()" disabled style="flex:1;background:#0f5a4d;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;opacity:0.5;">✅ ¡Empezar!</button>' +
          '<button onclick="window._obSkip()" style="flex:1;background:#f0f0f0;color:#555;border:none;border-radius:12px;padding:13px;font-size:14px;cursor:pointer;">Lo haré a mano</button>' +
        '</div>' +
      '</div>' +

      '</div>'; /* fin contenedor */

    document.body.appendChild(overlay);
    overlay._me = me;

    $('ob-yes').onclick = function(){
      $('ob-step1').style.display = 'none';
      $('ob-step2').style.display = '';
      loadBeniopenGroupsOb();
    };
    $('ob-no').onclick = function(){ window._obSkip(); };
  }

  function loadBeniopenGroupsOb(){
    var loadMsg = $('ob-load-msg');
    var groupSel = $('ob-group-sel');
    var errDiv = $('ob-err');
    loadMsg.style.display = '';
    loadMsg.textContent = 'Descargando los grupos de beniopen.es… ⏳';
    errDiv.style.display = 'none';

    Core.call('beniopen', 'GET', null).then(function(data){
      _boDataOnboard = data;
      loadMsg.style.display = 'none';
      groupSel.innerHTML = '<option value="">— Elige tu grupo —</option>' +
        (data.groups || []).map(function(g, i){
          return '<option value="'+i+'">'+escHtmlOb(g.label)+' ('+g.players.length+' jugadores)</option>';
        }).join('');
      groupSel.style.display = '';
    }).catch(function(err){
      loadMsg.textContent = '';
      errDiv.textContent = '⚠️ No se han podido cargar los grupos: ' + err.message + '. Puedes configurarlo manualmente desde ⚙️ Ajustes.';
      errDiv.style.display = '';
    });
  }

  window._obGroupChanged = function(){
    var sel = $('ob-group-sel');
    var nextBtn = $('ob-group-next');
    if(nextBtn) nextBtn.style.display = sel && sel.value !== '' ? '' : 'none';
  };

  window._obGroupNext = function(){
    var sel = $('ob-group-sel');
    if(!sel || !sel.value || !_boDataOnboard) return;
    var gi = +sel.value;
    var g = _boDataOnboard.groups[gi];
    $('ob-step2').style.display = 'none';
    $('ob-step3').style.display = '';
    $('ob-group-label').textContent = '📍 Grupo: ' + g.label;
    var playerSel = $('ob-player-sel');
    var sorted = g.players.slice().sort(function(a,b){ return a.localeCompare(b,'es',{sensitivity:'base'}); });
    playerSel.innerHTML = '<option value="">— Selecciona tu nombre —</option>' +
      sorted.map(function(p){ return '<option value="'+escHtmlOb(p)+'">'+escHtmlOb(p)+'</option>'; }).join('');
    playerSel._gi = gi;
  };

  window._obPlayerChanged = function(){
    var sel = $('ob-player-sel');
    var btn = $('ob-import-btn');
    var prev = $('ob-preview-txt');
    if(sel && sel.value){
      var gi = sel._gi;
      var g = _boDataOnboard && _boDataOnboard.groups && _boDataOnboard.groups[gi];
      var n = g ? g.players.length - 1 : 0;
      if(prev) prev.textContent = 'Se añadirán ' + n + ' rivales de tu grupo como adversarios.';
      if(btn){ btn.disabled = false; btn.style.opacity = '1'; }
    } else {
      if(prev) prev.textContent = '';
      if(btn){ btn.disabled = true; btn.style.opacity = '0.5'; }
    }
  };

  window._obImport = function(){
    var playerSel = $('ob-player-sel');
    if(!playerSel || !playerSel.value || !_boDataOnboard) return;
    var me = playerSel.value;
    var gi = playerSel._gi;
    var g = _boDataOnboard.groups[gi];
    var boSort = function(x,y){ return x.localeCompare(y,'es',{sensitivity:'base'}); };
    var others = g.players.filter(function(n){ return n !== me; }).sort(boSort);
    var opponents = others.map(function(n){ return {name:n, phone:'', email:'', ranking:null}; });
    var fixture = others.map(function(n){ return {opp:n, from:'', to:''}; });
    var clean = {
      playerName: me, myRanking: null,
      tournament: _boDataOnboard.edition || '37º Beniopen',
      group: g.label,
      pointsWin: 3, pointsLoss: 1,
      org: {phone:'', email:''},
      links: {clasificacion: g.url || '', resultados: ''},
      opponents: opponents, fixture: fixture, legacyGasUrl: ''
    };
    Core.call('me/config', 'PUT', {value: clean}).catch(function(){});
    window._pendingBeniopenConfig = clean;
    finishOnboarding(document.getElementById('onboarding-overlay')._me, clean);
  };

  window._obSkip = function(){
    try{ localStorage.setItem('liguilla_bo_skip','1'); }catch(e){}
    var overlay = document.getElementById('onboarding-overlay');
    finishOnboarding(overlay && overlay._me, null);
  };

  function finishOnboarding(me, pendingConfig){
    var overlay = document.getElementById('onboarding-overlay');
    if(overlay) overlay.remove();
    if(pendingConfig) window._pendingBeniopenConfig = pendingConfig;
    document.body.classList.remove('booting','signed-out');
    document.body.classList.add('signed-in');
    window.bootApp(me);
  }

  /* =====================================================================
     SUBMIT: login / signup / recover / newpass
     ===================================================================== */
  async function submit(){
    var btn = $('auth-submit'), email = $('f-email').value.trim(), pass = $('f-pass').value, d;
    btn.disabled = true;
    try{
      if(mode === 'login'){
        d = await Core.call('auth/login', 'POST', {email: email, password: pass}, true);
        Core.setToken(d.token); await enter();
      }else if(mode === 'signup'){
        d = await Core.call('auth/signup', 'POST', {email: email, password: pass, name: $('f-name').value.trim()}, true);
        Core.setToken(d.token);
        /* Cargar datos de sesión antes de mostrar el onboarding */
        var me = await Core.call('me');
        document.body.classList.remove('booting','signed-out');
        document.body.classList.add('signed-in');
        showOnboardingModal(me);
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
