/**
 * Mi Liguilla · backend en Google Apps Script
 * Sustituye a Netlify (Functions + Database + Identity).
 * Guarda todo en una hoja de Google Sheets creada por setup().
 *
 * PASOS: ver la guía. Resumen:
 *  1) Pega este archivo en script.google.com (proyecto nuevo) como Code.gs
 *  2) Rellena APP_URL (abajo) con la URL de tu app en GitHub Pages
 *  3) Ejecuta setup() una vez (autoriza permisos)
 *  4) Implementar > Nueva implementación > Aplicación web
 *     (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario)
 */

var ADMIN_EMAIL = 'mlogamba@gmail.com';   // cuenta administradora de la app
var APP_URL = '';                         // p. ej. 'https://TUUSUARIO.github.io/mi-liguilla/'  (con / final)
var SESSION_DAYS = 90;
var DAY = 86400000;
var CHUNK = 45000;                        // máx. por celda: 50.000 caracteres

var COLS = {
  Accounts: ['id','email','name','passHash','salt','pwv','isAdmin','active','createdAt','trialEndsAt','paidUntil','lastSeenAt','adminNotes','rev','resetToken','resetExp'],
  Payments: ['id','accountId','status','months','amount','paidOn','method','reference','note','createdAt'],
  Settings: ['key','value'],
  Data: ['accountId','kind','part','text']
};

var DEFAULT_SETTINGS = {
  trialDays: '14',
  graceDays: '7',
  warnDaysBefore: '3',
  monthlyPrice: '3',
  currency: 'EUR',
  paypalEmail: '',
  donationUrl: 'https://www.paypal.com/pool/9tjbXNXSNs?sr=wccr',
  signupOpen: '1',
  beniopenEdition: '37º Beniopen'
};

/* ============ Entradas HTTP ============ */
function doGet() {
  return json_({ status: 200, data: { ok: true, app: 'mi-liguilla' } });
}

function doPost(e) {
  var res, lock = null;
  try {
    var req = JSON.parse(e.postData.contents);
    var method = String(req.m || 'GET').toUpperCase();
    var path = String(req.p || '');
    if (method !== 'GET' || path.indexOf('auth/') === 0) {
      lock = LockService.getScriptLock();
      lock.waitLock(25000);
    }
    res = { status: 200, data: route_(req) };
  } catch (err) {
    res = { status: err.status || 500, error: err.status ? err.message : 'Error del servidor: ' + err.message };
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) {} }
  }
  return json_(res);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function httpErr_(status, message) { var e = new Error(message); e.status = status; return e; }

/* ============ Router ============ */
function route_(req) {
  var p = String(req.p || '').replace(/^\/+|\/+$/g, '');
  var m = String(req.m || 'GET').toUpperCase();
  var b = req.b || {};
  var seg = p.split('/');

  if (p === 'public-settings') return publicSettings_();
  if (p === 'auth/login') return authLogin_(b);
  if (p === 'auth/signup') return authSignup_(b);
  if (p === 'auth/recover') return authRecover_(b);
  if (p === 'auth/reset') return authReset_(b);

  var acc = authenticate_(req.t);
  if (seg[0] === 'beniopen') return getBeniopen_();
  if (seg[0] === 'me') return meRoute_(acc, seg, m, b);
  if (seg[0] === 'admin') {
    if (acc.isAdmin !== '1') throw httpErr_(403, 'No autorizado');
    return adminRoute_(seg, m, b);
  }
  throw httpErr_(404, 'Ruta no encontrada');
}

/* ============ Hoja de cálculo ============ */
var _ss = null;
function ss_() {
  if (_ss) return _ss;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta ejecutar setup() una vez');
  _ss = SpreadsheetApp.openById(id);
  return _ss;
}
function sheet_(name) { return ss_().getSheetByName(name); }

function readAll_(name) {
  var h = COLS[name], vals = sheet_(name).getDataRange().getValues(), rows = [];
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === '' && name !== 'Settings') continue;
    var o = { _row: i + 1 };
    for (var j = 0; j < h.length; j++) o[h[j]] = vals[i][j] === '' || vals[i][j] == null ? '' : String(vals[i][j]);
    rows.push(o);
  }
  return rows;
}

function writeRow_(name, row, obj) {
  var h = COLS[name], sh = sheet_(name);
  var vals = h.map(function (k) { return obj[k] == null ? '' : String(obj[k]); });
  if (!row) row = sh.getLastRow() + 1;
  var rng = sh.getRange(row, 1, 1, h.length);
  rng.setNumberFormat('@');
  rng.setValues([vals]);
  obj._row = row;
  return obj;
}

function nextId_(rows) {
  var max = 0;
  rows.forEach(function (r) { var n = Number(r.id) || 0; if (n > max) max = n; });
  return max + 1;
}

/* ---- Datos grandes (config / store) troceados en celdas ---- */
function readData_(accountId) {
  var vals = sheet_('Data').getDataRange().getValues(), parts = {};
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== String(accountId)) continue;
    var kind = String(vals[i][1]);
    (parts[kind] = parts[kind] || []).push({ n: Number(vals[i][2]) || 0, t: String(vals[i][3]) });
  }
  var out = {};
  Object.keys(parts).forEach(function (k) {
    out[k] = parts[k].sort(function (a, b) { return a.n - b.n; }).map(function (x) { return x.t; }).join('');
  });
  return out;
}

function setData_(accountId, kind, text) {
  var sh = sheet_('Data'), vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]) === String(accountId) && String(vals[i][1]) === kind) sh.deleteRow(i + 1);
  }
  var chunks = [];
  for (var o = 0; o < text.length; o += CHUNK) chunks.push(text.substr(o, CHUNK));
  if (!chunks.length) chunks.push('');
  var start = sh.getLastRow() + 1;
  var rng = sh.getRange(start, 1, chunks.length, 4);
  rng.setNumberFormat('@');
  rng.setValues(chunks.map(function (c, i) { return [String(accountId), kind, String(i), c]; }));
}

function deleteData_(accountId) {
  var sh = sheet_('Data'), vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) if (String(vals[i][0]) === String(accountId)) sh.deleteRow(i + 1);
}

/* ---- Ajustes ---- */
function settings_() {
  var s = {}, k;
  for (k in DEFAULT_SETTINGS) s[k] = DEFAULT_SETTINGS[k];
  readAll_('Settings').forEach(function (r) { if (r.key) s[r.key] = r.value; });
  return s;
}
function saveSettings_(patch) {
  var rows = readAll_('Settings');
  Object.keys(patch).forEach(function (k) {
    var found = null;
    rows.forEach(function (r) { if (r.key === k) found = r; });
    if (found) { found.value = String(patch[k]); writeRow_('Settings', found._row, found); }
    else { var n = writeRow_('Settings', null, { key: k, value: String(patch[k]) }); rows.push(n); }
  });
}
function settingsOut_(S) {
  return {
    trialDays: Number(S.trialDays) || 0,
    graceDays: Number(S.graceDays) || 0,
    warnDaysBefore: Number(S.warnDaysBefore) || 0,
    monthlyPrice: Number(S.monthlyPrice) || 0,
    currency: S.currency || 'EUR',
    paypalEmail: S.paypalEmail || '',
    donationUrl: S.donationUrl || ''
  };
}
function publicSettings_() {
  var S = settings_();
  return {
    donationUrl: S.donationUrl, trialDays: Number(S.trialDays) || 0,
    monthlyPrice: Number(S.monthlyPrice) || 0, currency: S.currency || 'EUR',
    signupOpen: S.signupOpen === '1'
  };
}

/* ============ Seguridad ============ */
function secret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}
function hmac_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret_()));
}
function makeToken_(acc) {
  var payload = { id: acc.id, pwv: acc.pwv, exp: Date.now() + SESSION_DAYS * DAY };
  var b = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  return b + '.' + hmac_(b);
}
function verifyToken_(tok) {
  if (!tok) return null;
  var parts = String(tok).split('.');
  if (parts.length !== 2 || hmac_(parts[0]) !== parts[1]) return null;
  try {
    var pl = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    return pl.exp > Date.now() ? pl : null;
  } catch (e) { return null; }
}
function hashPw_(pw, salt) {
  var h = salt + ':' + pw;
  for (var i = 0; i < 200; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  }
  return h;
}
function authenticate_(tok) {
  var pl = verifyToken_(tok);
  if (!pl) throw httpErr_(401, 'Sesión caducada');
  var acc = null;
  readAll_('Accounts').forEach(function (a) { if (a.id === String(pl.id)) acc = a; });
  if (!acc || acc.pwv !== String(pl.pwv)) throw httpErr_(401, 'Sesión caducada');
  return acc;
}
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function findByEmail_(email) {
  var found = null;
  readAll_('Accounts').forEach(function (a) { if (a.email === email) found = a; });
  return found;
}

/* ============ Cuentas y suscripciones ============ */
function ts_(s) { var t = s ? new Date(s).getTime() : 0; return isNaN(t) ? 0 : t; }
function expires_(a) { return Math.max(ts_(a.trialEndsAt), ts_(a.paidUntil)); }
function statusOf_(a, S) {
  if (a.isAdmin === '1') return 'admin';
  if (a.active !== '1') return 'disabled';
  var now = Date.now(), exp = expires_(a);
  if (now <= exp) return ts_(a.paidUntil) > now ? 'paid' : 'trial';
  if (now <= exp + (Number(S.graceDays) || 0) * DAY) return 'due';
  return 'blocked';
}
function accountOut_(a, S, pendingSet) {
  var exp = expires_(a), isAdmin = a.isAdmin === '1';
  return {
    id: Number(a.id), email: a.email, name: a.name, isAdmin: isAdmin,
    status: statusOf_(a, S), active: a.active === '1',
    createdAt: a.createdAt || null, lastSeenAt: a.lastSeenAt || null,
    trialEndsAt: a.trialEndsAt || null, paidUntil: a.paidUntil || null,
    expiresAt: isAdmin || !exp ? null : new Date(exp).toISOString(),
    graceEndsAt: isAdmin || !exp ? null : new Date(exp + (Number(S.graceDays) || 0) * DAY).toISOString(),
    daysLeft: isAdmin ? 0 : Math.max(0, Math.ceil((exp - Date.now()) / DAY)),
    adminNotes: a.adminNotes || '',
    hasPendingClaim: !!(pendingSet && pendingSet[a.id])
  };
}
function pendingSet_() {
  var set = {};
  readAll_('Payments').forEach(function (p) { if (p.status === 'pending') set[p.accountId] = true; });
  return set;
}
function extend_(acc, months) {
  var base = Math.max(Date.now(), ts_(acc.paidUntil));
  var d = new Date(base);
  d.setMonth(d.getMonth() + (Number(months) || 0));
  acc.paidUntil = d.toISOString();
}
function sendMail_(to, subject, body) {
  try { MailApp.sendEmail(to, subject, body); } catch (e) { Logger.log('Mail error: ' + e.message); }
}

function newAccount_(email, name, password, isAdmin, S) {
  var rows = readAll_('Accounts');
  var salt = Utilities.getUuid();
  var now = new Date();
  var acc = {
    id: nextId_(rows), email: email, name: name || '', salt: salt, pwv: '1',
    passHash: hashPw_(password, salt), isAdmin: isAdmin ? '1' : '0', active: '1',
    createdAt: now.toISOString(),
    trialEndsAt: isAdmin ? '' : new Date(now.getTime() + (Number(S.trialDays) || 0) * DAY).toISOString(),
    paidUntil: '', lastSeenAt: now.toISOString(), adminNotes: '', rev: '0', resetToken: '', resetExp: ''
  };
  return writeRow_('Accounts', null, acc);
}

function authLogin_(b) {
  var email = normEmail_(b.email), acc = findByEmail_(email);
  if (!acc || hashPw_(String(b.password || ''), acc.salt) !== acc.passHash) {
    throw httpErr_(401, 'Email o contraseña incorrectos.');
  }
  return { token: makeToken_(acc) };
}

function authSignup_(b) {
  var S = settings_();
  if (S.signupOpen !== '1') throw httpErr_(403, 'El registro está cerrado. Pide una invitación al administrador.');
  var email = normEmail_(b.email), pw = String(b.password || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpErr_(422, 'Revisa el email.');
  if (pw.length < 6) throw httpErr_(422, 'La contraseña debe tener al menos 6 caracteres.');
  if (findByEmail_(email)) throw httpErr_(409, 'Ya existe una cuenta con ese email.');
  var acc = newAccount_(email, String(b.name || '').substr(0, 80), pw, false, S);
  sendMail_(ADMIN_EMAIL, 'Mi Liguilla · nuevo usuario', 'Se ha registrado: ' + email + (b.name ? ' (' + b.name + ')' : ''));
  return { token: makeToken_(acc) };
}

function authRecover_(b) {
  var acc = findByEmail_(normEmail_(b.email));
  if (acc && APP_URL) {
    acc.resetToken = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
    acc.resetExp = String(Date.now() + 3600000);
    writeRow_('Accounts', acc._row, acc);
    sendMail_(acc.email, 'Mi Liguilla · nueva contraseña',
      'Pulsa este enlace para crear una nueva contraseña (válido 1 hora):\n\n' + APP_URL + '?reset=' + acc.resetToken +
      '\n\nSi no lo has pedido tú, ignora este mensaje.');
  }
  return { ok: true };
}

function authReset_(b) {
  var tok = String(b.token || ''), pw = String(b.password || ''), acc = null;
  if (pw.length < 6) throw httpErr_(422, 'La contraseña debe tener al menos 6 caracteres.');
  if (tok.length > 20) readAll_('Accounts').forEach(function (a) { if (a.resetToken === tok) acc = a; });
  if (!acc || Number(acc.resetExp) < Date.now()) throw httpErr_(400, 'El enlace ha caducado. Pide uno nuevo.');
  acc.salt = Utilities.getUuid();
  acc.passHash = hashPw_(pw, acc.salt);
  acc.pwv = String((Number(acc.pwv) || 1) + 1);
  acc.resetToken = ''; acc.resetExp = '';
  writeRow_('Accounts', acc._row, acc);
  return { token: makeToken_(acc) };
}

/* ============ /me ============ */
function meRoute_(acc, seg, m, b) {
  var S = settings_();
  var sub = seg.slice(1).join('/');

  if (sub === '' && m === 'GET') {
    var data = readData_(acc.id);
    if (Date.now() - ts_(acc.lastSeenAt) > 30 * 60000) {
      acc.lastSeenAt = new Date().toISOString();
      try { writeRow_('Accounts', acc._row, acc); } catch (e) {}
    }
    var store = null, config = {};
    try { if (data.store) store = JSON.parse(data.store); } catch (e) {}
    try { if (data.config) config = JSON.parse(data.config); } catch (e) {}
    return {
      account: accountOut_(acc, S, pendingSet_()),
      settings: settingsOut_(S),
      config: config, store: store, rev: Number(acc.rev) || 0
    };
  }

  if (sub === 'password' && m === 'POST') {
    var np = String(b.password || '');
    if (np.length < 6) throw httpErr_(422, 'La nueva contraseña debe tener al menos 6 caracteres.');
    if (hashPw_(String(b.current || ''), acc.salt) !== acc.passHash) throw httpErr_(403, 'La contraseña actual no es correcta.');
    acc.salt = Utilities.getUuid();
    acc.passHash = hashPw_(np, acc.salt);
    acc.pwv = String((Number(acc.pwv) || 1) + 1);
    writeRow_('Accounts', acc._row, acc);
    return { token: makeToken_(acc) };
  }

  var st = statusOf_(acc, S);
  if (st === 'blocked' || st === 'disabled') throw httpErr_(402, 'Suscripción vencida o cuenta desactivada');

  if (sub === 'store' && m === 'PUT') {
    var rev = Number(b.rev) || 0, cur = Number(acc.rev) || 0;
    if (rev < cur) throw httpErr_(409, 'Hay datos más recientes en la nube');
    var text = JSON.stringify(b.value || {});
    if (text.length > 400000) throw httpErr_(413, 'Datos demasiado grandes');
    setData_(acc.id, 'store', text);
    acc.rev = String(rev);
    writeRow_('Accounts', acc._row, acc);
    return { ok: true, rev: rev };
  }

  if (sub === 'config' && m === 'PUT') {
    var ctext = JSON.stringify(b.value || {});
    if (ctext.length > 200000) throw httpErr_(413, 'Configuración demasiado grande');
    setData_(acc.id, 'config', ctext);
    return { ok: true };
  }

  if (sub === 'claim' && m === 'POST') {
    if (pendingSet_()[acc.id]) return { ok: true };
    var months = Math.min(24, Math.max(1, parseInt(b.months, 10) || 1));
    var rows = readAll_('Payments');
    writeRow_('Payments', null, {
      id: nextId_(rows), accountId: acc.id, status: 'pending', months: months,
      amount: Math.round(months * (Number(S.monthlyPrice) || 0) * 100) / 100,
      paidOn: today_(), method: 'paypal', reference: '', note: '', createdAt: new Date().toISOString()
    });
    sendMail_(ADMIN_EMAIL, 'Mi Liguilla · aviso de pago', acc.email + ' avisa de un pago de ' + months + ' mes(es). Confírmalo en el panel de administración.');
    return { ok: true };
  }

  throw httpErr_(404, 'Ruta no encontrada');
}

function today_() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

/* ============ /admin ============ */
function overview_() {
  var S = settings_(), accs = readAll_('Accounts'), pays = readAll_('Payments');
  var pend = {}, byId = {};
  pays.forEach(function (p) { if (p.status === 'pending') pend[p.accountId] = true; });
  accs.forEach(function (a) { byId[a.id] = a; });
  var payments = pays.map(function (p) {
    var a = byId[p.accountId] || {};
    return {
      id: Number(p.id), accountId: Number(p.accountId), name: a.name || '', email: a.email || '',
      status: p.status, months: Number(p.months) || 0, amount: Number(p.amount) || 0,
      paidOn: p.paidOn, method: p.method, reference: p.reference, note: p.note, createdAt: p.createdAt
    };
  }).sort(function (x, y) { return x.paidOn < y.paidOn ? 1 : x.paidOn > y.paidOn ? -1 : y.id - x.id; });
  return {
    accounts: accs.map(function (a) { return accountOut_(a, S, pend); }),
    payments: payments,
    settings: settingsOut_(S)
  };
}

function getAccount_(id) {
  var f = null;
  readAll_('Accounts').forEach(function (a) { if (a.id === String(id)) f = a; });
  if (!f) throw httpErr_(404, 'Cuenta no encontrada');
  return f;
}
function getPayment_(id) {
  var f = null;
  readAll_('Payments').forEach(function (p) { if (p.id === String(id)) f = p; });
  if (!f) throw httpErr_(404, 'Movimiento no encontrado');
  return f;
}

function adminRoute_(seg, m, b) {
  var sub = seg.slice(1);                      // p. ej. ['payments','12']
  var res = sub[0], id = sub[1];

  if (res === 'overview' && m === 'GET') return overview_();

  if (res === 'payments') {
    if (m === 'POST' && !id) {
      var acc = getAccount_(b.accountId);
      var months = Number(b.months) || 0;
      writeRow_('Payments', null, {
        id: nextId_(readAll_('Payments')), accountId: acc.id, status: 'confirmed', months: months,
        amount: Number(b.amount) || 0, paidOn: b.paidOn || today_(), method: b.method || 'altro',
        reference: String(b.reference || ''), note: String(b.note || ''), createdAt: new Date().toISOString()
      });
      if (b.extend && months > 0) { extend_(acc, months); writeRow_('Accounts', acc._row, acc); }
      return overview_();
    }
    if (m === 'PATCH' && id) {
      var p = getPayment_(id);
      if (b.status && b.status !== p.status) {
        if (b.status === 'confirmed' && p.status === 'pending') {
          var a2 = getAccount_(p.accountId);
          extend_(a2, Number(p.months) || 0);
          writeRow_('Accounts', a2._row, a2);
        }
        p.status = b.status;
      }
      ['months', 'amount', 'paidOn', 'reference', 'note'].forEach(function (k) {
        if (b[k] !== undefined) p[k] = String(b[k]);
      });
      writeRow_('Payments', p._row, p);
      return overview_();
    }
    if (m === 'DELETE' && id) {
      sheet_('Payments').deleteRow(getPayment_(id)._row);
      return overview_();
    }
  }

  if (res === 'accounts') {
    if (id === 'bulk' && m === 'POST') {
      readAll_('Accounts').forEach(function (a) {
        if (a.isAdmin === '1') return;
        a.active = b.active ? '1' : '0';
        writeRow_('Accounts', a._row, a);
      });
      return overview_();
    }
    if (m === 'PATCH' && id) {
      var ac = getAccount_(id);
      if (b.name !== undefined) ac.name = String(b.name);
      if (b.adminNotes !== undefined) ac.adminNotes = String(b.adminNotes);
      if (b.active !== undefined && ac.isAdmin !== '1') ac.active = b.active ? '1' : '0';
      if (b.trialEndsAt !== undefined) ac.trialEndsAt = b.trialEndsAt ? new Date(b.trialEndsAt).toISOString() : '';
      if (b.paidUntil !== undefined) ac.paidUntil = b.paidUntil ? new Date(b.paidUntil).toISOString() : '';
      writeRow_('Accounts', ac._row, ac);
      return overview_();
    }
  }

  if (res === 'beniopen' && id === 'refresh' && m === 'POST') {
    var fresh = scrapeBeniopen_();
    setData_('_beniopen', 'cache', JSON.stringify(fresh));
    return overview_();
  }

  if (res === 'settings' && m === 'PUT') {
    var patch = {};
    ['trialDays', 'graceDays', 'warnDaysBefore', 'monthlyPrice'].forEach(function (k) {
      if (b[k] !== undefined) patch[k] = String(Math.max(0, Number(b[k]) || 0));
    });
    if (b.currency !== undefined) patch.currency = String(b.currency).toUpperCase().substr(0, 3) || 'EUR';
    if (b.paypalEmail !== undefined) patch.paypalEmail = String(b.paypalEmail).trim();
    if (b.donationUrl !== undefined) patch.donationUrl = String(b.donationUrl).trim();
    saveSettings_(patch);
    return overview_();
  }

  throw httpErr_(404, 'Ruta no encontrada');
}

/* ============ Beniopen: grupos y jugadores (se leen de beniopen.es) ============ */
var BO_BASE = 'https://www.beniopen.es/';
var BO_SEED = BO_BASE + 'table/segunda-b/';          // página que contiene el menú con todos los grupos
var BO_FALLBACK = ['segunda-a', 'segunda-b', 'segunda-c', 'segunda-d', 'segunda-e'];
var BO_TTL = 12 * 3600000;                           // la lista se refresca como máximo cada 12 h
var BO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function getBeniopen_() {
  var S = settings_();
  var cache = readBoCache_();
  if (!cache || Date.now() - cache.updatedAt > BO_TTL) {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
      try {
        var again = readBoCache_();
        if (again && Date.now() - again.updatedAt <= BO_TTL) { cache = again; }
        else {
          try {
            cache = scrapeBeniopen_();
            setData_('_beniopen', 'cache', JSON.stringify(cache));
          } catch (e) {
            if (!cache) throw httpErr_(502, 'No se han podido leer los jugadores de beniopen.es: ' + e.message);
          }
        }
      } finally { lock.releaseLock(); }
    } else if (!cache) {
      throw httpErr_(503, 'El servidor está ocupado. Inténtalo de nuevo en unos segundos.');
    }
  }
  return { edition: cache.edition || S.beniopenEdition, updatedAt: cache.updatedAt, groups: cache.groups };
}

function readBoCache_() {
  try {
    var raw = readData_('_beniopen').cache;
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function fetchHtml_(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': BO_UA, 'Accept-Language': 'es-ES,es;q=0.9' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode() + ' en ' + url);
  return r.getContentText();
}

function scrapeBeniopen_() {
  var seed = fetchHtml_(BO_SEED);
  var slugs = discoverGroups_(seed);
  if (slugs.indexOf('segunda-b') < 0) slugs.push('segunda-b');
  if (slugs.length < 2) slugs = BO_FALLBACK.slice();
  var reqs = slugs.map(function (sl) {
    return { url: BO_BASE + 'table/' + sl + '/', muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': BO_UA, 'Accept-Language': 'es-ES,es;q=0.9' } };
  });
  var resp = UrlFetchApp.fetchAll(reqs), groups = [];
  resp.forEach(function (r, i) {
    if (r.getResponseCode() !== 200) return;
    var names = parseNames_(r.getContentText());
    if (names.length) groups.push({ slug: slugs[i], label: prettySlug_(slugs[i]), url: reqs[i].url, players: names });
  });
  if (!groups.length) throw new Error('no se ha encontrado ningún jugador en las tablas');
  return { updatedAt: Date.now(), edition: detectEdition_(seed), groups: groups };
}

function discoverGroups_(html) {
  var re = /href\s*=\s*["'](?:https?:\/\/(?:www\.)?beniopen\.es)?\/table\/([a-z0-9_%\-]+)\/?["']/gi, m, out = [];
  while ((m = re.exec(html))) { if (out.indexOf(m[1]) < 0) out.push(m[1]); }
  return out;
}

function detectEdition_(html) {
  var re = /(\d{1,3})\s*(?:º|°|&ordm;|&deg;|&#186;|&#176;)\s*Beniopen/gi, m, max = 0;
  while ((m = re.exec(html))) { var n = Number(m[1]); if (n > max && n < 200) max = n; }
  return max ? max + 'º Beniopen' : '';
}

function prettySlug_(slug) {
  return slug.split('-').map(function (w) {
    return w.length === 1 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

var HTML_ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ccedil: 'ç', Ccedil: 'Ç', agrave: 'à', egrave: 'è', ograve: 'ò' };

function textOf_(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(Number(d)); })
    .replace(/&([a-zA-Z]+);/g, function (m, n) { return HTML_ENT[n] !== undefined ? HTML_ENT[n] : m; })
    .replace(/\s+/g, ' ').trim();
}

/* Devuelve los nombres de la tabla con más filas de la página (clasificación del grupo) */
function parseNames_(html) {
  var tables = html.match(/<table[\s\S]*?<\/table>/gi) || [], best = [];
  tables.forEach(function (t) {
    var rows = t.match(/<tr[\s\S]*?<\/tr>/gi) || [], names = [];
    rows.forEach(function (r) {
      var cells = r.match(/<td[\s\S]*?<\/td>/gi) || [];
      if (!cells.length) return;
      var cell = null;
      for (var i = 0; i < cells.length && !cell; i++) if (/class\s*=\s*["'][^"']*data-name/i.test(cells[i])) cell = cells[i];
      for (var j = 0; j < cells.length && !cell; j++) if (/[A-Za-zÀ-ÿ]{2,}/.test(textOf_(cells[j]))) cell = cells[j];
      if (!cell) return;
      var name = textOf_(cell);
      if (name && !/^(pos|jugador|equipo|total)$/i.test(name) && names.indexOf(name) < 0) names.push(name);
    });
    if (names.length > best.length) best = names;
  });
  if (!best.length) {   // plan B: enlaces a fichas de jugador/equipo
    var re = /<a\s[^>]*href\s*=\s*["'][^"']*\/(?:player|team|jugador|equipo)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, m;
    while ((m = re.exec(html))) { var n = textOf_(m[1]); if (n && /[A-Za-zÀ-ÿ]{2,}/.test(n) && best.indexOf(n) < 0) best.push(n); }
  }
  return best;
}

/* Ejecuta esta función desde el editor para comprobar la lectura de beniopen.es */
function testBeniopen() {
  var html = fetchHtml_(BO_SEED);
  Logger.log('Grupos detectados en el menú: ' + discoverGroups_(html).join(', '));
  Logger.log('Edición detectada: ' + detectEdition_(html));
  var names = parseNames_(html);
  Logger.log('Jugadores en segunda-b: ' + names.length + ' → ' + names.join(' | '));
  if (!names.length) {
    Logger.log('NO SE HAN ENCONTRADO JUGADORES. Longitud del HTML: ' + html.length);
    Logger.log('Primer <table> para depurar: ' + (html.match(/<table[\s\S]*?<\/table>/i) || ['(no hay ninguna <table>)'])[0].substr(0, 3000));
    return;
  }
  var c = scrapeBeniopen_();
  setData_('_beniopen', 'cache', JSON.stringify(c));
  Logger.log('Guardado en caché:\n' + c.groups.map(function (g) { return g.label + ': ' + g.players.length + ' jugadores'; }).join('\n'));
}

/* ============ Instalación (ejecutar UNA vez desde el editor) ============ */
function setup() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('SHEET_ID'), ss;
  if (id) { ss = SpreadsheetApp.openById(id); }
  else { ss = SpreadsheetApp.create('Mi Liguilla · Base de datos'); p.setProperty('SHEET_ID', ss.getId()); }
  _ss = ss;

  Object.keys(COLS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, COLS[name].length).setValues([COLS[name]]);
    sh.setFrozenRows(1);
  });
  ['Hoja 1', 'Sheet1', 'Hoja1', 'Foglio1'].forEach(function (n) {
    var d = ss.getSheetByName(n);
    if (d && ss.getSheets().length > 1) ss.deleteSheet(d);
  });

  var have = {};
  readAll_('Settings').forEach(function (r) { have[r.key] = true; });
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!have[k]) writeRow_('Settings', null, { key: k, value: DEFAULT_SETTINGS[k] });
  });

  if (!findByEmail_(normEmail_(ADMIN_EMAIL))) {
    var pw = Utilities.getUuid().replace(/-/g, '').substr(0, 10);
    newAccount_(normEmail_(ADMIN_EMAIL), 'Administrador', pw, true, settings_());
    Logger.log('CONTRASEÑA TEMPORAL DE ADMINISTRADOR (' + ADMIN_EMAIL + '): ' + pw);
    sendMail_(ADMIN_EMAIL, 'Mi Liguilla · contraseña de administrador',
      'Tu cuenta de administrador está lista.\nEmail: ' + ADMIN_EMAIL + '\nContraseña temporal: ' + pw +
      '\n\nEntra en la app y cámbiala con "¿Has olvidado la contraseña?" cuando quieras.');
  } else {
    Logger.log('El administrador ya existía.');
  }
  Logger.log('Base de datos: ' + ss.getUrl());
}

/* ============ Contraseña de administrador ============
 * Ejecuta resetAdmin() desde el editor si no has recibido la contraseña
 * o la has perdido. La nueva contraseña aparece en el "Registro de ejecución"
 * (abajo en el editor) y se intenta enviar también por email. */
function resetAdmin() {
  var email = normEmail_(ADMIN_EMAIL);
  var pw = Utilities.getUuid().replace(/-/g, '').substr(0, 10);
  var acc = findByEmail_(email);
  if (!acc) {
    newAccount_(email, 'Administrador', pw, true, settings_());
  } else {
    acc.salt = Utilities.getUuid();
    acc.passHash = hashPw_(pw, acc.salt);
    acc.pwv = String((Number(acc.pwv) || 1) + 1);
    acc.isAdmin = '1'; acc.active = '1';
    writeRow_('Accounts', acc._row, acc);
  }
  Logger.log('CONTRASEÑA TEMPORAL DE ADMINISTRADOR (' + email + '): ' + pw);
  sendMail_(email, 'Mi Liguilla · nueva contraseña de administrador',
    'Email: ' + email + '\nContraseña temporal: ' + pw);
}
