/* Cliente del backend (Google Apps Script) y sesión */
(function(){
  var KEY = 'liguilla_session';
  function token(){ try{ return localStorage.getItem(KEY) || null; }catch(e){ return null; } }
  function setToken(t){ try{ if(t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); }catch(e){} }

  /* POST con texto plano: evita el preflight CORS que Apps Script no admite */
  async function call(path, method, body, noAuth){
    var url = (window.APP_CONFIG || {}).GAS_URL || '';
    if(!/^https:\/\/script\.google\.com\//.test(url)){
      var ce = new Error('Falta configurar la URL del servidor en config.js'); ce.network = true; throw ce;
    }
    var payload = {p: path, m: method || 'GET', t: noAuth ? null : token(), b: body === undefined ? null : body};
    var r, j;
    try{
      r = await fetch(url, {method:'POST', body: JSON.stringify(payload), redirect:'follow'});
      j = await r.json();
    }catch(e){
      var ne = new Error('No se puede conectar con el servidor. Inténtalo de nuevo.'); ne.network = true; throw ne;
    }
    if(!j || j.status >= 400){
      var er = new Error((j && j.error) || 'Error del servidor'); er.status = j ? j.status : 500; throw er;
    }
    return j.data;
  }

  window.Core = {call: call, token: token, setToken: setToken};
})();
