/* ---------- Configuración del usuario (se edita en ⚙️ Ajustes) ---------- */
let ME_ACC = null;        // cuenta: estado de la suscripción, email…
let APP_SETTINGS = {};    // precio, PayPal, donación (los fija el administrador)
let CFG = {};             // datos del torneo de este usuario
let ORG = {phone:'', email:''};
let PLAYERS = {};
let RANKING = {};
let FIXTURE = [];

function normalizeConfig(c){
  c = (c && typeof c === 'object') ? c : {};
  return {
    playerName: c.playerName || '',
    myRanking: c.myRanking || null,
    tournament: c.tournament || '',
    group: c.group || '',
    pointsWin: Number.isFinite(+c.pointsWin) && c.pointsWin !== '' ? +c.pointsWin : 3,
    pointsLoss: Number.isFinite(+c.pointsLoss) && c.pointsLoss !== '' ? +c.pointsLoss : 1,
    org: Object.assign({phone:'', email:''}, c.org || {}),
    links: Object.assign({clasificacion:'', resultados:''}, c.links || {}),
    opponents: Array.isArray(c.opponents) ? c.opponents.filter(o=>o && o.name) : [],
    fixture: Array.isArray(c.fixture) ? c.fixture.filter(f=>f && f.opp) : [],
    legacyGasUrl: c.legacyGasUrl || ''
  };
}

/* Recalcula las estructuras que usa el resto de la app a partir de CFG */
function applyConfig(c){
  CFG = normalizeConfig(c);
  ORG = {phone: CFG.org.phone, email: CFG.org.email};
  PLAYERS = {}; RANKING = {};
  CFG.opponents.forEach(o=>{
    PLAYERS[o.name] = {phone: o.phone || '', email: o.email || ''};
    if(o.ranking) RANKING[o.name] = o.ranking;
  });
  if(CFG.playerName && CFG.myRanking) RANKING[CFG.playerName] = CFG.myRanking;
  FIXTURE = CFG.fixture.map((f,i)=>({n:i+1, from:f.from||'', to:f.to||'', opp:f.opp, periodo:fmtRange(f.from, f.to)}));
  document.title = (CFG.tournament || 'Mi Liguilla') + (CFG.group ? ' · '+CFG.group : '');
  const h1 = document.getElementById('hdr-title'), sub = document.getElementById('hdr-sub');
  if(h1) h1.textContent = CFG.tournament || 'Mi Liguilla';
  if(sub) sub.textContent = [CFG.group, CFG.playerName].filter(Boolean).join(' · ') || 'Configura tu liguilla en ⚙️';
}

function ME(){ return CFG.playerName || 'yo'; }
function TOURN(){ return CFG.tournament || 'la liguilla'; }
function TOURN_FULL(){ return TOURN() + (CFG.group ? ' ('+CFG.group+')' : ''); }
function playerOf(opp){ return PLAYERS[opp] || {phone:'', email:''}; }
/* WhatsApp necesita solo dígitos (con prefijo de país si lo hay) */
function cleanPhone(p){ return String(p||'').replace(/[^\d]/g,''); }
function waPhone(p){ const d = cleanPhone(p); return d.length === 9 ? '34'+d : d; }

function rankOf(opp){ return RANKING[opp] || null; }
function rankChip(opp){ const r = rankOf(opp); return r ? `<small class="rk">🏅 nº${r}</small>` : ''; }
function rankLine(opp){ const r = rankOf(opp); return r ? `<div class="when">🏅 Ranking actual: nº ${r}</div>` : ''; }

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtRange(a, b){
  if(!a && !b) return 'sin fechas';
  if(!a || !b) return fmtShort(a || b);
  const da = parseYMD(a), db = parseYMD(b);
  if(da.getMonth() === db.getMonth()) return da.getDate()+'–'+db.getDate()+' '+MESES_CORTOS[db.getMonth()];
  return fmtShort(a)+' – '+fmtShort(b);
}
function fmtShort(d){ if(!d) return ''; const x = parseYMD(d); return x.getDate()+' '+MESES_CORTOS[x.getMonth()]; }
function isConfigured(){ return !!(CFG.playerName && FIXTURE.length); }

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['dom','lun','mar','mié','jue','vie','sáb'];

const DEFAULT_COURTS = [
  {id:"c_canaleta",   name:"La Canaleta · Mislata",               address:"FHHP+P6, Mislata, València",                    bookingUrl:"https://mislata.apuntate.online/pio/instalaciones.xhtml?area=40"},
  {id:"c_samaranch",  name:"Enjoy! Samaranch",                    address:"Enjoy! Valencia Clubes Outdoor, València",      bookingUrl:"https://enjoyvalenciaclubesoutdoor.reservaplay.com/reserves/cal_week.php"},
  {id:"c_drlluch",    name:"Poliesportiu Dr. Lluch",              address:"Poliesportiu Dr. Lluch, València",              bookingUrl:"https://drlluch.pistacentral.es/reservas"},
  {id:"c_boixteam",   name:"Boix Team · Gran Vía",                address:"Boix Team, Gran Vía, València",                 bookingUrl:"https://boixteam.es/booking-gran-via"},
  {id:"c_lliria",     name:"Poliesportiu El Canó · Llíria",       address:"Poliesportiu El Canó, Llíria",                  bookingUrl:"https://www.lliria.es/es/seccion/deporte"},
  {id:"c_vtc",        name:"Valencia Tennis Center · Malvarrosa", address:"Valencia Tennis Center, Malvarrosa, València",  bookingUrl:"https://valenciateniscenter.matchpoint.com.es/"}
];

const BO_STATIC_DATA = {"edition":"37º Beniopen","updatedAt":1792085492432,"groups":[{"slug":"segunda-a","label":"Segunda A","url":"https://www.beniopen.es/table/segunda-a/","players":["José M. Lara","Julián Ramírez","Sergio Ros","Alex García","Juan González","Marcos Ortíz","Bradley Suter","Enrique Álvarez","Lifeng Ou","Manuel Bullón","Carlos Gutiérrez","Miguel Martínez"]},{"slug":"segunda-b","label":"Segunda B","url":"https://www.beniopen.es/table/segunda-b/","players":["Ramón Andrés","Juan C. Arias","Marcello Gambardella","Juan B. Esteve","Luis Neira","Tim F.","Amalio Mota","Mauricio Senabre","Javier Herrero","Miguel Arellano","Raúl Ruiz","Vale T."]},{"slug":"segunda-c","label":"Segunda C","url":"https://www.beniopen.es/table/segunda-c/","players":["Fernando Vegas","Raúl Ortega","Fernando Guillamón","Daniel Alonso S.","Pablo Carbo","Abel Fernández","Juan Gomis","Alejandro López","Andrés Martínez","Carlos Marquez","José L. Haro","Paco Ordaz"]},{"slug":"segunda-d","label":"Segunda D","url":"https://www.beniopen.es/table/segunda-d/","players":["Adrián García R.","Jesús Bosca","Olek B.","Dmytro A.","Ricardo García M.","Eduardo J. Gómez","Paco Morante","Gerardo Morante","Jorge López","Jesús Guerrero","Marco Catalán","Vicent Escutia"]},{"slug":"segunda-e","label":"Segunda E","url":"https://www.beniopen.es/table/segunda-e/","players":["Agustín I.","Nacho Sánchez","Claudio S.","Dani S.","Jesús Vergara","Pablo Wagner","Rodrigo B.","Álvaro Zancajo","Sebastián Sánchez","Rafa Soria","Raquel Salavert","Cheng Xu"]},{"slug":"segunda-f","label":"Segunda F","url":"https://www.beniopen.es/table/segunda-f/","players":["Vicente Balaguer","Fran Hernández","Juan Sánchez V.","Manuel Agudo","David Méndez","Andrea Romaguera","Andrés Valiente","Antonio Nieto","Israel Marín","Luis Sánchez G.","Nino Villanueva","Maya K."]}]};

/* ---------- Storage ---------- */
let store = {matches:{}, cache:{campo:""}, courts:null, privNotes:{}};
let lsKey = 'liguilla_data';

function normalizeStore(s){
  if(!s || typeof s !== 'object') s = {};
  if(!s.matches || typeof s.matches !== 'object') s.matches = {};
  if(!s.cache || typeof s.cache !== 'object') s.cache = {campo:""};
  if(!Array.isArray(s.courts) || s.courts.length === 0) s.courts = DEFAULT_COURTS.map(c=>({...c}));
  if(!s.privNotes || typeof s.privNotes !== 'object') s.privNotes = {};
  if(typeof s._rev !== 'number') s._rev = 0;
  return s;
}

function showSyncIndicator(text){
  const el = document.getElementById('sync-indicator');
  if(!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showSyncIndicator._t);
  showSyncIndicator._t = setTimeout(()=>el.classList.remove('show'), 1500);
}

function save(){
  store._rev = Date.now();
  try{ localStorage.setItem(lsKey, JSON.stringify(store)); }catch(e){}
  salvaDatiCloud();
}

function defaultMatch(n){
  return {n, opp:FIXTURE[n-1].opp, date:"", time:"", campo:"", campoAddress:"", played:false, resultType:"normal", sets:[["",""],["",""],["",""]], winner:"", notes:"", eventId:"", eventInvited:false};
}
function peekMatch(n){
  const m = store.matches[n];
  if(!m) return defaultMatch(n);
  return Object.assign({eventId:"", eventInvited:false, campoAddress:"", sets:[["",""],["",""]]}, m, {opp:FIXTURE[n-1].opp});
}
function getMatch(n){
  if(!store.matches[n]) store.matches[n] = defaultMatch(n);
  const m = store.matches[n];
  m.opp = FIXTURE[n-1].opp;   // el rival de la jornada puede cambiar en Ajustes
  if(m.eventId === undefined) m.eventId = "";
  if(m.eventInvited === undefined) m.eventInvited = false;
  if(m.campoAddress === undefined) m.campoAddress = "";
  return m;
}
function matchState(m){
  if(m.played) return m.winner==='me' ? 'win' : 'loss';
  if(m.date) return 'sched';
  return 'todo';
}
function getPrivNote(opp){ return (store.privNotes && store.privNotes[opp]) || ''; }

function refreshAll(){
  if(!document.getElementById('view-inicio')) return;
  renderInicio();
  renderCalendario();
  renderPartidas();
}

/* ---------- Navegación ---------- */
function showView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  const tab = document.querySelector('.tab[data-view="'+v+'"]');
  if(tab) tab.classList.add('active');
  if(v==='inicio') renderInicio();
  if(v==='calendario') renderCalendario();
  if(v==='partidas') renderPartidas();
  if(v==='invitar') renderInvitar();
  if(v==='pista') renderCourtsManager();
  if(v==='ajustes') renderAjustes();
  try{ window.scrollTo(0,0); }catch(e){}
}

/* ---------- Utilidades mensajes ---------- */
function waLink(phone, text){ return "https://wa.me/"+waPhone(phone)+"?text="+encodeURIComponent(text); }
function mailLink(to, cc, subject, body){ return "mailto:"+to+"?cc="+encodeURIComponent(cc)+"&subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body); }
function isIOS(){ return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
function isAndroid(){ return /Android/i.test(navigator.userAgent); }
function gmailWebLink(to, cc, subject, body){ return "https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(to)+"&cc="+encodeURIComponent(cc)+"&su="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body); }
function mapsSearchLink(query){ return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(query||''); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function copyText(text, btn){
  const done = ()=>{ if(btn){ const old = btn.textContent; btn.textContent = "✅ Copiado"; setTimeout(()=>btn.textContent = old, 1500); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done)); }
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done){
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); done(); }catch(e){}
  document.body.removeChild(ta);
}
function fmtDate(d){ if(!d) return "por confirmar"; const [y,m,day]=d.split("-"); return day+"/"+m+"/"+y; }
function parseYMD(d){ const p = d.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function sortKey(m){ return m.date+' '+(m.time||'99:99'); }

/* ---------- Selector de hora ---------- */
const TIME_CHIPS = ['08:00','09:00','10:00','11:00','12:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

function timeChipsHTML(id){
  return TIME_CHIPS.map(t=>`<button type="button" class="chip" onclick="setTimeValue('${id}','${t}')">${t}</button>`).join('');
}
function pad2(n){ return String(n).padStart(2,'0'); }
function parseTimeOrDefault(value){
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec((value||'').trim());
  if(!m) return {h:18, min:0};
  let h = parseInt(m[1],10);
  let min = m[2]!=='' ? parseInt(m[2],10) : 0;
  if(isNaN(h)) h = 18;
  if(isNaN(min)) min = 0;
  h = Math.min(Math.max(h,0),23);
  min = Math.min(Math.max(min,0),59);
  return {h, min};
}
function setTimeValue(id, value){
  const el = document.getElementById(id);
  if(!el) return;
  el.value = value;
}
function stepTime(id, deltaMinutes){
  const el = document.getElementById(id);
  if(!el) return;
  const {h, min} = parseTimeOrDefault(el.value);
  let total = h*60 + min + deltaMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(total/60), nm = total%60;
  el.value = pad2(nh)+':'+pad2(nm);
}

function resultText(m){
  if(m.resultType==='wo_favor') return "WO a mi favor";
  if(m.resultType==='wo_contra') return "WO en mi contra";
  const sets = (m.sets||[]).filter(s=>s[0]!=="" && s[1]!=="");
  if(!sets.length) return "sin registrar";
  return sets.map(s=>s[0]+"-"+s[1]).join(", ");
}
function calcWinner(m){
  if(m.resultType==='wo_favor') return 'me';
  if(m.resultType==='wo_contra') return 'opp';
  let meSets=0, oppSets=0;
  m.sets.forEach(s=>{ if(s[0]!=="" && s[1]!==""){ const a=Number(s[0]), b=Number(s[1]); if(a>b) meSets++; else if(b>a) oppSets++; } });
  if(meSets===0 && oppSets===0) return "";
  return meSets>oppSets ? 'me' : 'opp';
}
/* Mensaje de resultado: NO incluye nunca la nota privada */
function matchMessage(m){
  const f = FIXTURE[m.n-1];
  const ganador = m.winner==='me' ? ME() : m.opp;
  return "Resultado "+TOURN()+(CFG.group?" — "+CFG.group:"")+"\n"
    +"Jornada "+m.n+" ("+f.periodo+")\n"
    +ME()+" vs "+m.opp+"\n"
    +"Resultado: "+resultText(m)+"\n"
    +"*Ganador: "+ganador+"*\n"
    +"Fecha: "+fmtDate(m.date)+(m.time?" · "+m.time+"h":"")+"\n"
    +"Pista: "+(m.campo||"—");
}

/* ---------- INICIO ---------- */
function rowPlayed(m){
  const st = matchState(m);
  return `<div class="row" role="button" tabindex="0" onclick="openResultModal(${m.n})">
    <div class="jchip ${st}">J${m.n}</div>
    <div class="row-body">
      <div class="opp-name">${escapeHtml(m.opp)}${rankChip(m.opp)}</div>
      <div class="row-sub">${escapeHtml(resultText(m))}${m.date?' · '+fmtDate(m.date):''}</div>
    </div>
    <span class="pill ${st}${m.resultType!=='normal'?' wo':''}">${st==='win'?'Ganada':'Perdida'}</span>
  </div>`;
}
function rowSched(m){
  const d = parseYMD(m.date);
  return `<div class="row" role="button" tabindex="0" onclick="openProgramaModal(${m.n})">
    <div class="dateblk sched"><b>${d.getDate()}</b><span>${DIAS[d.getDay()]}</span></div>
    <div class="row-body">
      <div class="opp-name">${escapeHtml(m.opp)}<small>J${m.n}</small>${rankChip(m.opp)}</div>
      <div class="row-sub">🕒 ${m.time?escapeHtml(m.time)+'h':'hora por confirmar'}<br>📍 ${m.campo?escapeHtml(m.campo):'pista por confirmar'}</div>
    </div>
  </div>`;
}

function renderInicio(){
  renderSubBanner();
  const setup = document.getElementById('setup-wrap');
  if(setup) setup.innerHTML = isConfigured() ? '' : `
    <div class="card next-card setup-card">
      <span class="pill jor">Primeros pasos</span>
      <div class="opp">Configura tu liguilla</div>
      <p class="hint">Añade tu nombre, tus rivales, las fechas de cada jornada y los datos de la organización. Solo tarda un par de minutos.</p>
      <div class="form-actions"><button class="btn primary" onclick="showView('ajustes')">⚙️ Empezar configuración</button></div>
    </div>`;
  const ph = document.getElementById('points-hint');
  if(ph) ph.textContent = 'Cada partido vale '+CFG.pointsWin+' puntos si ganas y '+CFG.pointsLoss+' si pierdes. Toca un partido para editarlo.';
  const all = FIXTURE.map(f=>peekMatch(f.n));
  let points=0, wins=0;
  const playedList = all.filter(m=>m.played);
  playedList.forEach(m=>{ if(m.winner==='me'){ points+=CFG.pointsWin; wins++; } else if(m.winner==='opp'){ points+=CFG.pointsLoss; } });
  document.getElementById('st-points').textContent = points;
  document.getElementById('st-played').textContent = playedList.length+"/"+FIXTURE.length;
  document.getElementById('st-wins').textContent = wins;

  const next = all.find(m=>!m.played);
  const wrap = document.getElementById('next-wrap');
  if(!FIXTURE.length){
    wrap.innerHTML = '';
  } else if(!next){
    wrap.innerHTML = '<div class="card empty">¡Liguilla completada! 🎾</div>';
  } else {
    const f = FIXTURE[next.n-1];
    const p = playerOf(next.opp);
    const when = next.date
      ? `<div class="when">📅 ${fmtDate(next.date)}${next.time?' · '+escapeHtml(next.time)+'h':''}${next.campo?'<br>📍 '+escapeHtml(next.campo):''}</div>`
      : `<div class="when">Aún sin fecha</div>`;
    const waBtn = p.phone
      ? `<a class="btn wa small span2" href="${waLink(p.phone, inviteText(f))}" target="_blank" rel="noopener">📱 Escribir por WhatsApp</a>`
      : '';
    wrap.innerHTML = `
      <div class="card next-card">
        <span class="pill jor">Próxima · Jornada ${next.n} · ${f.periodo}</span>
        <div class="opp">vs ${escapeHtml(next.opp)}</div>
        ${rankLine(next.opp)}
        ${when}
        <div class="row-actions">
          ${waBtn}
          <button class="btn cal small" onclick="openProgramaModal(${next.n})">📅 Programar</button>
          <button class="btn court small" onclick="openResultModal(${next.n})">🏆 Resultado</button>
        </div>
      </div>`;
  }

  const playedEl = document.getElementById('home-played');
  playedEl.innerHTML = `<h3>Partidos jugados <span class="count">(${playedList.length})</span></h3>` +
    (playedList.length ? playedList.map(rowPlayed).join('') : '<div class="empty" style="padding:14px 0 6px;">Todavía no has jugado ningún partido.</div>');

  const schedList = all.filter(m=>!m.played && m.date).sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  const schedEl = document.getElementById('home-sched');
  schedEl.innerHTML = `<h3>Partidos programados <span class="count">(${schedList.length})</span></h3>` +
    (schedList.length ? schedList.map(rowSched).join('') : '<div class="empty" style="padding:14px 0 6px;">No hay partidos con fecha. Programa uno desde "Partidas".</div>');
}
function inviteText(f){
  return "Hola "+f.opp+"! Soy "+ME()+", tu rival de la jornada "+f.n+" del "+TOURN()+" ("+(CFG.group?CFG.group+", ":"")+"periodo "+f.periodo+"). ¿Cuándo te viene bien jugar? ¡Un saludo!";
}

/* ---------- CLASIFICACIÓN / RESULTADOS: la web oficial dentro de la app ---------- */
const LINK_INFO = {
  clasificacion: {title:'📊 Clasificación', empty:'Todavía no has añadido el enlace de la clasificación.'},
  resultados:    {title:'🏁 Resultados',    empty:'Todavía no has añadido el enlace de los resultados.'}
};
function openLinkModal(kind){
  const info = LINK_INFO[kind];
  const url = (CFG.links && CFG.links[kind]) || '';
  const bg = document.getElementById('frame-bg');
  document.getElementById('frame-title').textContent = info.title;
  const out = document.getElementById('frame-out');
  const body = document.getElementById('frame-body');
  if(!url){
    out.style.display = 'none';
    body.innerHTML = `<div class="empty" style="padding:40px 16px;">${info.empty}<br><br>
      <button class="btn primary" onclick="closeFrame(); showView('ajustes'); setTimeout(()=>{ const el=document.getElementById('cfg-link-${kind}'); if(el){ el.focus(); el.scrollIntoView({block:'center'}); } }, 50);">⚙️ Añadir enlace</button></div>`;
  } else {
    out.style.display = '';
    out.href = url;
    body.innerHTML = `<div class="frame-loading">⏳ Cargando…</div>
      <iframe id="frame-iframe" src="${escapeHtml(url)}" referrerpolicy="no-referrer-when-downgrade"
        onload="this.previousElementSibling && this.previousElementSibling.remove()"></iframe>
      <div class="frame-tip">¿No se ve la página? Algunas webs no permiten mostrarse dentro de otras apps: usa <b>↗ Abrir fuera</b>.</div>`;
  }
  bg.classList.add('open');
  document.body.classList.add('frame-open');
}
function reloadFrame(){
  const f = document.getElementById('frame-iframe');
  if(f) f.src = f.src;
}
function closeFrame(){
  document.getElementById('frame-bg').classList.remove('open');
  document.body.classList.remove('frame-open');
  document.getElementById('frame-body').innerHTML = '';
}

/* ---------- CALENDARIO ---------- */
function calCard(m){
  const st = matchState(m);
  const d = parseYMD(m.date);
  const hora = m.time ? escapeHtml(m.time)+'h' : 'Hora por confirmar';
  const lugar = m.campo ? escapeHtml(m.campo) : 'Pista por confirmar';
  const res = m.played
    ? `<div class="cal-res ${st}">${st==='win'?'Ganada':'Perdida'} · ${escapeHtml(resultText(m))}</div>`
    : `<div class="cal-res sched">Programada</div>`;
  return `<div class="cal-card">
    <div class="dateblk ${st==='todo'?'sched':st}"><b>${d.getDate()}</b><span>${DIAS[d.getDay()]}</span></div>
    <div class="cal-body">
      <div class="opp-name">${escapeHtml(m.opp)}<small>J${m.n}</small>${rankChip(m.opp)}</div>
      <div class="cal-meta">🕒 ${hora}</div>
      <div class="cal-meta">📍 ${lugar}</div>
      ${res}
      <div class="row-actions">
        <button class="btn cal small" onclick="openProgramaModal(${m.n})">📅 Editar</button>
        <button class="btn court small" onclick="openResultModal(${m.n})">🏆 ${m.played?'Resultado':'Anotar'}</button>
        ${m.campo?`<a class="btn ghost small span2" href="${mapsSearchLink(m.campoAddress||m.campo)}" target="_blank" rel="noopener">🗺️ Ver en Maps</a>`:''}
      </div>
    </div>
  </div>`;
}
function undatedCard(m){
  const f = FIXTURE[m.n-1];
  const st = matchState(m);
  const info = m.played
    ? `<span class="pill ${st}">${st==='win'?'Ganada':'Perdida'}</span> <span class="row-sub">${escapeHtml(resultText(m))}</span>`
    : `<span class="pill todo">Sin fecha</span>`;
  return `<div class="cal-card">
    <div class="jchip ${st==='todo'?'':st}" style="${st==='todo'?'background:var(--todo-bg);color:var(--todo);':''}align-self:flex-start;">J${m.n}</div>
    <div class="cal-body">
      <div class="opp-name">${escapeHtml(m.opp)}${rankChip(m.opp)}</div>
      <div class="cal-meta">Periodo: ${f.periodo}</div>
      <div style="margin-top:6px;">${info}</div>
      <div class="row-actions">
        <button class="btn cal small" onclick="openProgramaModal(${m.n})">📅 Programar</button>
        <button class="btn court small" onclick="openResultModal(${m.n})">🏆 ${m.played?'Resultado':'Anotar'}</button>
      </div>
    </div>
  </div>`;
}
function renderCalendario(){
  const el = document.getElementById('cal-list');
  if(!el) return;
  const all = FIXTURE.map(f=>peekMatch(f.n));
  const dated = all.filter(m=>m.date).sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  const undated = all.filter(m=>!m.date);
  let html = '', lastKey = '';
  dated.forEach(m=>{
    const key = m.date.slice(0,7);
    if(key !== lastKey){
      lastKey = key;
      const parts = key.split('-');
      html += `<h3 class="month">${MESES[Number(parts[1])-1]} ${parts[0]}</h3>`;
    }
    html += calCard(m);
  });
  if(!dated.length){
    html += '<div class="card empty">Todavía no hay partidos con fecha.<br>Programa uno desde "Partidas".</div>';
  }
  if(undated.length){
    html += '<h3 class="month">Sin fecha</h3>' + undated.map(undatedCard).join('');
  }
  el.innerHTML = html;
}

/* ---------- PARTIDAS ---------- */
function matchCard(f){
  const m = peekMatch(f.n);
  const st = matchState(m);
  let pill;
  if(m.played) pill = `<span class="pill ${st}${m.resultType!=='normal'?' wo':''}">${m.winner==='me'?'Ganada':'Perdida'}</span>`;
  else if(m.date) pill = `<span class="pill sched">Programada</span>`;
  else pill = `<span class="pill todo">Sin fecha</span>`;
  const when = m.date ? fmtDate(m.date)+(m.time?' · '+escapeHtml(m.time)+'h':'') : 'Sin fecha';
  const priv = getPrivNote(m.opp);

  return `<div class="match">
    <div class="head"><b>J${f.n} · ${escapeHtml(f.opp)}${rankOf(f.opp)?' · 🏅 nº'+rankOf(f.opp):''}</b>${pill}</div>
    <div class="meta">${f.periodo}<br>📅 ${when}${m.campo?'<br>📍 '+escapeHtml(m.campo):''}${m.eventId?'<br>🔗 Añadido al calendario'+(m.eventInvited?' (rival invitado)':''):''}</div>
    ${m.played? `<div class="score">${escapeHtml(resultText(m))} — ${m.winner==='me'?'Gané yo':'Ganó '+escapeHtml(m.opp)}</div>`:''}
    ${m.notes? `<div class="note-line">📝 ${escapeHtml(m.notes)}</div>` : ''}
    ${priv? `<div class="priv-note"><b>🔒 Nota privada (solo tú)</b><p>${escapeHtml(priv)}</p></div>` : ''}
    <div class="row-actions">
      <button class="btn cal small" onclick="openProgramaModal(${f.n})">📅 Programar</button>
      <button class="btn court small" onclick="openResultModal(${f.n})">🏆 ${m.played?'Editar resultado':'Resultado'}</button>
      <button class="btn ghost small" onclick="openPrivNoteModal(${f.n})">🔒 ${priv?'Editar nota privada':'Nota privada'}</button>
      ${m.campo? `<a class="btn ghost small" href="${mapsSearchLink(m.campoAddress||m.campo)}" target="_blank" rel="noopener">🗺️ Maps</a>` : ''}
      ${m.played? `<button class="btn wa small" onclick="sendWA(${f.n},'opp')">📱 Rival</button>
                   <button class="btn wa small" onclick="sendWA(${f.n},'org')">📱 Organización</button>
                   <button class="btn mail small" onclick="sendMail(${f.n})">✉️ Email</button>
                   <button class="btn ghost small" onclick="copyMatch(${f.n}, this)">📋 Copiar</button>` : ''}
    </div>
  </div>`;
}
function renderPartidas(){
  const el = document.getElementById('matches-list');
  if(!el) return;
  el.innerHTML = FIXTURE.map(matchCard).join('');
}

/* ---------- Nota privada por rival ---------- */
function openPrivNoteModal(n){
  const f = FIXTURE[n-1];
  const note = getPrivNote(f.opp);
  document.getElementById('modal-title').textContent = "🔒 Nota privada · " + f.opp;
  document.getElementById('modal-body').innerHTML = `
    <p class="hint">Solo la ves tú en esta app. No se incluye nunca en los mensajes de WhatsApp o email, ni en el evento de Google Calendar.</p>
    <label>Tu nota sobre ${escapeHtml(f.opp)}</label>
    <textarea id="m-privnote" rows="5" placeholder="Ej: Revés flojo, sube mucho a la red, prefiere tierra batida...">${escapeHtml(note)}</textarea>
    <div class="form-actions">
      <button class="btn primary" onclick="savePrivNote(${n})">💾 Guardar nota</button>
      ${note?`<button class="btn ghost danger" onclick="deletePrivNote(${n})">🗑️ Borrar nota</button>`:''}
      <button class="btn ghost" onclick="closeModal()">Cerrar</button>
    </div>`;
  document.getElementById('modal-bg').classList.add('open');
}
function savePrivNote(n){
  const f = FIXTURE[n-1];
  const txt = document.getElementById('m-privnote').value.trim();
  if(!store.privNotes) store.privNotes = {};
  if(txt) store.privNotes[f.opp] = txt;
  else delete store.privNotes[f.opp];
  save();
  closeModal();
  refreshAll();
}
function deletePrivNote(n){
  const f = FIXTURE[n-1];
  if(!confirm('¿Borrar la nota privada sobre '+f.opp+'?')) return;
  if(store.privNotes) delete store.privNotes[f.opp];
  save();
  closeModal();
  refreshAll();
}
/* MODAL: Programar Partida */
function openProgramaModal(n){
  const m = getMatch(n);
  const f = FIXTURE[n-1];

  const hasEmail = !!playerOf(f.opp).email;
  const linkNote = m.eventId
    ? `<div class="hint">🔗 Ya lo añadiste a tu calendario${m.eventInvited?` (con ${escapeHtml(f.opp)} invitado)`:''}. Si cambias la fecha, vuelve a añadirlo y borra el evento anterior.</div>`
    : '';
  const removeBtn = m.date
    ? `<button class="btn ghost small danger btn-cal-action" onclick="cancelarCita(${n})">🗑️ Cancelar cita</button>`
    : '';

  document.getElementById('modal-title').textContent = "📅 Programar J" + n + " · vs " + f.opp;
  document.getElementById('modal-body').innerHTML = `
    <label>Fecha del partido</label>
    <input type="date" id="m-date" value="${m.date}">

    <label>Hora</label>
    <div class="time-picker">
      <button type="button" class="time-step" onclick="stepTime('m-time',-15)" aria-label="Menos 15 minutos">−</button>
      <input type="time" class="time-input" id="m-time" value="${m.time||'18:00'}" step="300">
      <button type="button" class="time-step" onclick="stepTime('m-time',15)" aria-label="Más 15 minutos">+</button>
    </div>
    <div class="time-chips">${timeChipsHTML('m-time')}</div>

    <label>Pista / club</label>
    <div class="campo-field">
      <select id="m-campo" class="campo-select" onchange="handleCampoChange('m-campo')">${courtsOptionsHTML(m.campo||store.cache.campo||'')}</select>
      <button type="button" class="btn ghost small" onclick="closeModal(); showView('pista')">⚙️ Pistas</button>
    </div>
    <div id="m-campo-custom-wrap" class="custom-court-box" style="display:none;">
      <input type="text" id="m-campo-newname" placeholder="Nombre de la pista">
      <input type="text" id="m-campo-newaddr" placeholder="Dirección / referencia de Google Maps (opcional)">
      <button type="button" class="btn primary small" onclick="addCourtInline('m-campo')" style="width:100%;">➕ Añadir y usar esta pista</button>
    </div>

    <label>Notas del partido (se incluyen en el evento de Calendar)</label>
    <textarea id="m-notes" rows="2" placeholder="Ej: Pista reservada, llevar bolas...">${escapeHtml(m.notes||'')}</textarea>
    <p class="hint">Para apuntes solo tuyos usa "🔒 Nota privada" en la pestaña Partidas.</p>

    ${linkNote}
    <div id="cal-status" class="hint" style="margin-top:6px;"></div>

    <div class="form-actions">
      <button class="btn primary btn-cal-action" onclick="saveProgramazione(${n})">💾 Solo guardar</button>
      <button class="btn cal btn-cal-action" onclick="guardarYCalendario(${n}, 'google')">📅 Guardar + Google Calendar</button>
      ${hasEmail?`<button class="btn court btn-cal-action" onclick="guardarYCalendario(${n}, 'invite')">📤 Guardar + Calendar + invitar</button>`:''}
      <button class="btn ghost btn-cal-action" onclick="guardarYCalendario(${n}, 'ics')">📥 Guardar + archivo .ics (iPhone / Outlook)</button>
      ${removeBtn}
      <button class="btn ghost" onclick="closeModal()">Cerrar</button>
    </div>
  `;
  document.getElementById('modal-bg').classList.add('open');
}

/* ---------- Pistas ---------- */
function courtsOptionsHTML(selectedValue){
  let html = '<option value="">— Selecciona una pista —</option>';
  let matched = false;
  store.courts.forEach(c=>{
    const sel = c.name === selectedValue ? ' selected' : '';
    if(sel) matched = true;
    html += `<option value="${escapeHtml(c.name)}"${sel}>${escapeHtml(c.name)}</option>`;
  });
  if(selectedValue && !matched){
    html += `<option value="${escapeHtml(selectedValue)}" selected>${escapeHtml(selectedValue)} (personalizada)</option>`;
  }
  html += `<option value="__custom__">➕ Otra pista (escribir)…</option>`;
  return html;
}

function handleCampoChange(selectId){
  const sel = document.getElementById(selectId);
  const wrap = document.getElementById(selectId+'-custom-wrap');
  if(!sel || !wrap) return;
  wrap.style.display = (sel.value === '__custom__') ? '' : 'none';
}

function addOrUpdateCourt(name, address, bookingUrl){
  const existing = store.courts.find(c=>c.name.toLowerCase()===name.toLowerCase());
  if(existing){ existing.address = address; if(bookingUrl !== undefined) existing.bookingUrl = bookingUrl; }
  else { store.courts.push({id:'c_'+Date.now().toString(36), name, address, bookingUrl: bookingUrl || ''}); }
  save();
}

function refreshAllCourtSelects(selectedName){
  document.querySelectorAll('select.campo-select').forEach(sel=>{
    sel.innerHTML = courtsOptionsHTML(selectedName || '');
    const wrap = document.getElementById(sel.id+'-custom-wrap');
    if(wrap) wrap.style.display = 'none';
  });
}

function addCourtInline(selectId){
  const nameEl = document.getElementById(selectId+'-newname');
  const addrEl = document.getElementById(selectId+'-newaddr');
  const name = nameEl.value.trim();
  if(!name){ alert('Escribe el nombre de la pista.'); return; }
  const address = addrEl.value.trim() || name;
  addOrUpdateCourt(name, address);
  refreshAllCourtSelects(name);
  nameEl.value=''; addrEl.value='';
  showSyncIndicator('Pista añadida ✓');
}

function renderCourtsManager(){
  const wrap = document.getElementById('courts-manager');
  if(!wrap) return;
  const bl = document.getElementById('booking-list');
  if(bl){
    const withUrl = store.courts.filter(c=>c.bookingUrl);
    bl.innerHTML = withUrl.length
      ? withUrl.map(c=>`<a class="btn court small" href="${escapeHtml(c.bookingUrl)}" target="_blank" rel="noopener">🎾 ${escapeHtml(c.name)}</a>`).join('')
      : '<p class="hint">Añade el enlace de reserva a tus pistas (abajo) para tenerlas aquí a mano.</p>';
  }
  if(!store.courts.length){
    wrap.innerHTML = '<p class="hint">Todavía no hay pistas guardadas.</p>';
    return;
  }
  wrap.innerHTML = store.courts.map((c,i)=>`
    <div class="court-row" data-idx="${i}">
      <input type="text" class="court-name" value="${escapeHtml(c.name)}" placeholder="Nombre de la pista">
      <input type="text" class="court-addr" value="${escapeHtml(c.address)}" placeholder="Dirección / referencia de Google Maps">
      <input type="url" class="court-url" value="${escapeHtml(c.bookingUrl||'')}" placeholder="Enlace de reserva online (opcional)">
      <div class="row-actions">
        <a class="btn ghost small span2" href="${mapsSearchLink(c.address||c.name)}" target="_blank" rel="noopener">🗺️ Ver en Maps</a>
        <button type="button" class="btn primary small" onclick="saveCourtRow(${i})">💾 Guardar</button>
        <button type="button" class="btn ghost small danger" onclick="deleteCourtRow(${i})">🗑️ Borrar</button>
      </div>
    </div>`).join('');
}

function saveCourtRow(i){
  const row = document.querySelectorAll('#courts-manager .court-row')[i];
  if(!row) return;
  const name = row.querySelector('.court-name').value.trim();
  const address = row.querySelector('.court-addr').value.trim();
  const bookingUrl = normUrl(row.querySelector('.court-url').value);
  if(!name){ alert('El nombre no puede estar vacío.'); return; }
  store.courts[i] = {...store.courts[i], name, address: address || name, bookingUrl};
  save();
  renderCourtsManager();
  refreshAllCourtSelects();
  showSyncIndicator('Pista guardada ✓');
}

function deleteCourtRow(i){
  if(!confirm('¿Eliminar esta pista de la lista? (Los partidos ya programados conservan el nombre guardado.)')) return;
  store.courts.splice(i,1);
  save();
  renderCourtsManager();
  refreshAllCourtSelects();
}

function addCourtFromManager(){
  const nameEl = document.getElementById('new-court-name');
  const addrEl = document.getElementById('new-court-addr');
  const name = nameEl.value.trim();
  if(!name){ alert('Escribe un nombre para la pista.'); return; }
  const address = addrEl.value.trim() || name;
  const urlEl = document.getElementById('new-court-url');
  addOrUpdateCourt(name, address, normUrl(urlEl.value));
  nameEl.value=''; addrEl.value=''; urlEl.value='';
  renderCourtsManager();
  refreshAllCourtSelects();
  showSyncIndicator('Pista añadida ✓');
}

function saveProgramazione(n, opts){
  const m = getMatch(n);
  m.date = document.getElementById('m-date').value;
  m.time = document.getElementById('m-time').value;
  const campoSel = document.getElementById('m-campo');
  let campoName = campoSel.value;
  if(campoName === '__custom__'){
    const typed = document.getElementById('m-campo-newname');
    campoName = typed ? typed.value.trim() : '';
  }
  m.campo = campoName;
  const courtMatch = store.courts.find(c=>c.name===campoName);
  m.campoAddress = courtMatch ? courtMatch.address : campoName;
  m.notes = document.getElementById('m-notes').value.trim();
  if(m.campo) store.cache.campo = m.campo;
  save();
  if(!opts || !opts.keepModalOpen){
    closeModal();
  }
  refreshAll();
}

/* ---------- Calendario del móvil: Google Calendar o archivo .ics ---------- */
function matchTimes(m){
  const [h, mi] = (m.time || '18:00').split(':').map(Number);
  const start = parseYMD(m.date); start.setHours(h||0, mi||0, 0, 0);
  const end = new Date(start.getTime() + 90*60000);
  return {start, end};
}
function icsStamp(d){ return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'T'+pad2(d.getHours())+pad2(d.getMinutes())+'00'; }
/* A Calendar solo se envían: rival, fecha, hora, pista y notas del partido. La nota privada NO. */
function eventTexts(m){
  return {
    title: '🎾 '+TOURN()+': '+ME()+' vs '+m.opp,
    details: TOURN_FULL()+' - Jornada '+m.n+'\nRival: '+m.opp+(m.notes ? '\nNotas: '+m.notes : ''),
    location: m.campoAddress || m.campo || ''
  };
}
function googleCalLink(m, invite){
  const {start, end} = matchTimes(m);
  const t = eventTexts(m);
  const p = playerOf(m.opp);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text='+encodeURIComponent(t.title)
    + '&dates='+icsStamp(start)+'/'+icsStamp(end)
    + '&details='+encodeURIComponent(t.details)
    + '&location='+encodeURIComponent(t.location)
    + (invite && p.email ? '&add='+encodeURIComponent(p.email) : '');
}
function downloadIcs(m){
  const {start, end} = matchTimes(m);
  const t = eventTexts(m);
  const esc = s => String(s).replace(/[\;,]/g, c=>'\\'+c).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MiLiguilla//ES','BEGIN:VEVENT',
    'UID:liguilla-'+m.n+'-'+Date.now()+'@miliguilla',
    'DTSTAMP:'+icsStamp(new Date()), 'DTSTART:'+icsStamp(start), 'DTEND:'+icsStamp(end),
    'SUMMARY:'+esc(t.title), 'DESCRIPTION:'+esc(t.details), 'LOCATION:'+esc(t.location),
    'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:'+esc(t.title),'END:VALARM',
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
  a.download = 'jornada-'+m.n+'.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
function guardarYCalendario(n, mode){
  if(!document.getElementById('m-date').value){
    alert("Selecciona una fecha antes de añadirlo al calendario.");
    return;
  }
  saveProgramazione(n, {keepModalOpen:true});
  const m = getMatch(n);
  if(mode === 'ics') downloadIcs(m);
  else window.open(googleCalLink(m, mode === 'invite'), '_blank', 'noopener');
  m.eventId = 'cal'; m.eventInvited = mode === 'invite';
  save();
  refreshAll();
  closeModal();
}
function cancelarCita(n){
  const m = getMatch(n);
  if(!confirm('¿Cancelar esta cita?'+(m.eventId ? ' Recuerda borrarla también de tu calendario.' : ''))) return;
  m.date = ""; m.time = ""; m.campo = ""; m.campoAddress = ""; m.notes = ""; m.eventId = ""; m.eventInvited = false;
  save();
  closeModal();
  refreshAll();
}

/* MODAL: Registrar / Editar Resultado */
function openResultModal(n){
  const m = getMatch(n);
  const f = FIXTURE[n-1];

  document.getElementById('modal-title').textContent = "🏆 Resultado J" + n + " · vs " + f.opp;
  document.getElementById('modal-body').innerHTML = `
    <label>Tipo de resultado</label>
    <select id="m-type">
      <option value="normal" ${m.resultType==='normal'?'selected':''}>Partido jugado</option>
      <option value="wo_favor" ${m.resultType==='wo_favor'?'selected':''}>WO a mi favor</option>
      <option value="wo_contra" ${m.resultType==='wo_contra'?'selected':''}>WO en mi contra</option>
    </select>

    <div id="sets-wrap" style="${m.resultType!=='normal'?'display:none':''}">
      <div id="sets-rows">${renderSetsRows(m.sets && m.sets.length ? m.sets : [["",""],["",""]])}</div>
      <button type="button" class="btn ghost small" onclick="addSetRow()" style="width:100%;">+ Añadir set</button>
    </div>

    <label>Notas del partido</label>
    <textarea id="m-notes" rows="2" placeholder="Ej: Juego disputado, buen saque del rival...">${escapeHtml(m.notes||'')}</textarea>

    <div class="form-actions">
      <button class="btn primary" onclick="saveResultado(${n})">Guardar resultado</button>
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
    </div>
  `;

  document.getElementById('m-type').onchange = function(){
    document.getElementById('sets-wrap').style.display = this.value==='normal' ? '' : 'none';
  };

  document.getElementById('modal-bg').classList.add('open');
}

function saveResultado(n){
  const m = getMatch(n);
  m.resultType = document.getElementById('m-type').value;
  if(m.resultType==='normal'){
    m.sets = collectSetsFromDOM();
  }
  m.notes = document.getElementById('m-notes').value.trim();
  const w = calcWinner(m);
  m.winner = w;
  m.played = (m.resultType!=='normal') || (w!=="");

  save();
  closeModal();
  refreshAll();
}

function closeModal(){
  document.getElementById('modal-bg').classList.remove('open');
}

function renderSetsRows(sets){
  return sets.map((s,i)=>`
    <div class="set-row">
      <div class="lab"><span>Set ${i+1} (yo — rival)</span>${sets.length>1?`<button type="button" class="set-remove" onclick="removeSetRow(${i})">✕ quitar</button>`:''}</div>
      <div class="inputs2col">
        <input type="number" inputmode="numeric" class="set-a" placeholder="Yo" value="${s[0]}">
        <input type="number" inputmode="numeric" class="set-b" placeholder="Rival" value="${s[1]}">
      </div>
    </div>`).join('');
}

function collectSetsFromDOM(){
  return Array.from(document.querySelectorAll('#sets-rows .set-row')).map(row=>[
    row.querySelector('.set-a').value,
    row.querySelector('.set-b').value
  ]);
}

function addSetRow(){
  const sets = collectSetsFromDOM();
  sets.push(["",""]);
  document.getElementById('sets-rows').innerHTML = renderSetsRows(sets);
}

function removeSetRow(i){
  const sets = collectSetsFromDOM();
  sets.splice(i,1);
  document.getElementById('sets-rows').innerHTML = renderSetsRows(sets);
}

function sendWA(n, target){
  const m = getMatch(n);
  const text = matchMessage(m);
  const phone = target==='opp' ? playerOf(m.opp).phone : ORG.phone;
  if(!phone){ alert(target==='opp' ? 'Falta el teléfono de '+m.opp+' (añádelo en ⚙️ Ajustes).' : 'Falta el teléfono de la organización (añádelo en ⚙️ Ajustes).'); return; }
  window.open(waLink(phone, text), '_blank');
}

function sendMail(n){
  const m = getMatch(n);
  const text = matchMessage(m);
  const to = playerOf(m.opp).email, cc = ORG.email, subject = "Resultado "+(CFG.group || TOURN())+" · J"+m.n;
  if(isIOS() || isAndroid()){
    window.location.href = mailLink(to, cc, subject, text);
  }else{
    window.open(gmailWebLink(to, cc, subject, text), '_blank');
  }
}

function copyMatch(n, btn){ copyText(matchMessage(getMatch(n)), btn); }

/* ---------- INVITAR ---------- */
function renderInvitar(){
  const sel = document.getElementById('inv-opp');
  const prevOpp = sel.value;
  sel.innerHTML = FIXTURE.length
    ? FIXTURE.map(f=>`<option value="${escapeHtml(f.opp)}">J${f.n} · ${escapeHtml(f.opp)}${rankOf(f.opp)?' (nº'+rankOf(f.opp)+')':''}</option>`).join('')
    : '<option value="">— Añade rivales y jornadas en ⚙️ Ajustes —</option>';
  if(prevOpp) sel.value = prevOpp;
  const chipsWrap = document.getElementById('inv-time-chips');
  if(chipsWrap && !chipsWrap.dataset.filled){
    chipsWrap.innerHTML = timeChipsHTML('inv-time');
    chipsWrap.dataset.filled = "1";
  }
  document.getElementById('inv-campo').innerHTML = courtsOptionsHTML(store.cache.campo || "");
  document.getElementById('inv-campo-custom-wrap').style.display = 'none';
  document.getElementById('inv-msgbox').innerHTML = "";
  document.getElementById('inv-send').innerHTML = "";
}

function generarInvitacion(){
  const opp = document.getElementById('inv-opp').value;
  const date = document.getElementById('inv-date').value;
  const time = document.getElementById('inv-time').value;
  const campoSel = document.getElementById('inv-campo');
  let campo = campoSel.value;
  if(campo === '__custom__'){
    const typed = document.getElementById('inv-campo-newname');
    campo = typed ? typed.value.trim() : '';
  }
  if(campo) { store.cache.campo = campo; save(); }
  const f = FIXTURE.find(x=>x.opp===opp);
  if(!f) return;
  const text = "Hola "+opp+"! Soy "+ME()+", tu rival de la jornada "+f.n+" del "+TOURN_FULL()+". Te propongo jugar el "+fmtDate(date)+(time?" a las "+time+"h":"")+(campo?" en "+campo:"")+". ¿Te viene bien? ¡Un saludo!";
  document.getElementById('inv-msgbox').innerHTML = `<div class="msgbox">${escapeHtml(text)}</div>`;
  const p = playerOf(opp);
  window._invText = text;
  document.getElementById('inv-send').innerHTML =
    (p.phone ? `<a class="btn wa" href="${waLink(p.phone, text)}" target="_blank" rel="noopener" style="flex:1 1 100%;">📱 Enviar por WhatsApp</a>` : '')
    + `<button class="btn ghost" onclick="copyText(window._invText, this)" style="flex:1 1 100%;">📋 Copiar mensaje</button>`;
}

/* ---------- API y sincronización (Google Apps Script) ---------- */
async function api(path, opts){
  opts = opts || {};
  return window.Core.call(path, opts.method || 'GET', opts.body !== undefined ? opts.body : null);
}

function hhmm(){ return new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit', second:'2-digit'}); }
function setSyncStatus(ok, msg){
  const el = document.getElementById('sync-status');
  if(!el) return;
  el.innerHTML = (ok ? '✅ ' : '❌ ') + '<b>Sincronización:</b> ' + escapeHtml(msg);
  el.style.color = ok ? 'var(--win)' : 'var(--loss)';
}
function forceSync(){
  setSyncStatus(true, 'sincronizando…');
  loadRemote(true);
}

let saveTimer = null, isSaving = false, saveAgain = false, isSyncing = false;
function salvaDatiCloud(){
  if(!ME_ACC) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushStore, 700);
}
function pushStore(){
  if(isSaving){ saveAgain = true; return; }
  isSaving = true;
  showSyncIndicator('Guardando…');
  api('me/store', {method:'PUT', body:{value: store, rev: store._rev}})
    .then(()=>{ showSyncIndicator('☁️ Guardado'); setSyncStatus(true, 'guardado en la nube a las ' + hhmm()); })
    .catch(err=>{
      console.error('Error al guardar en la nube:', err);
      if(err.status === 402 || err.status === 401) loadRemote(true);
      showSyncIndicator('⚠️ No se pudo guardar'); setSyncStatus(false, 'no se pudo guardar (' + err.message + ')');
    })
    .finally(()=>{
      isSaving = false;
      if(saveAgain){ saveAgain = false; pushStore(); }
    });
}

/* JSON con claves ordenadas, para comparar contenidos sin falsos positivos */
function stable(o){
  return JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v))
    ? Object.keys(v).sort().reduce((a, x) => (a[x] = v[x], a), {})
    : v);
}

/* Aplica la respuesta de /api/me: la versión más reciente (nube o móvil) gana */
function applyRemote(me, first){
  ME_ACC = me.account;
  APP_SETTINGS = me.settings || {};
  if(stable(normalizeConfig(me.config)) !== stable(CFG)) applyConfig(me.config);
  const remoteRev = Number(me.rev) || 0;
  const localRev = store._rev || 0;
  if(remoteRev > localRev){
    store = normalizeStore(me.store);
    store._rev = remoteRev;
    try{ localStorage.setItem(lsKey, JSON.stringify(store)); }catch(e){}
    if(!first) showSyncIndicator('☁️ Datos actualizados');
  } else if(localRev > remoteRev){
    pushStore();
  }
  refreshAll();
  renderSubscription(first);
}

function loadRemote(force){
  if(isSyncing || (isSaving && !force)) return;
  isSyncing = true;
  api('me')
    .then(me=>{ applyRemote(me, false); setSyncStatus(true, 'conectado, última comprobación a las ' + hhmm()); })
    .catch(err=>{
      if(err.status === 401){ location.reload(); return; }
      setSyncStatus(false, 'no se pudo leer la nube (' + err.message + ')');
    })
    .finally(()=>{ isSyncing = false; });
}

/* ---------- Suscripción, pagos y donaciones ---------- */
function fmtLong(iso){ return iso ? new Date(iso).toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'}) : '—'; }
function money(n){ return (Number(n)||0).toLocaleString('es-ES', {style:'currency', currency: APP_SETTINGS.currency || 'EUR'}); }

function paypalPayLink(months){
  const s = APP_SETTINGS;
  const total = Math.round(months * (Number(s.monthlyPrice)||0) * 100) / 100;
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  return 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick'
    + '&business=' + encodeURIComponent(s.paypalEmail || '')
    + '&item_name=' + encodeURIComponent('Suscripción Mi Liguilla · ' + months + (months>1?' meses':' mes') + ' · ' + (ME_ACC ? ME_ACC.email : ''))
    + '&amount=' + total.toFixed(2)
    + '&currency_code=' + encodeURIComponent(s.currency || 'EUR')
    + '&no_shipping=1'
    + '&custom=' + encodeURIComponent('acc-' + (ME_ACC ? ME_ACC.id : ''))
    + '&return=' + encodeURIComponent(base + '?pago=ok')
    + '&cancel_return=' + encodeURIComponent(base);
}
function donate(){ window.open(APP_SETTINGS.donationUrl || 'https://www.paypal.com/pool/9tjbXNXSNs?sr=wccr', '_blank', 'noopener'); }

function payBoxHTML(){
  const price = Number(APP_SETTINGS.monthlyPrice) || 0;
  const opts = [1,3,6,12].map(n=>`<option value="${n}">${n} ${n>1?'meses':'mes'} · ${money(n*price)}</option>`).join('');
  const pending = ME_ACC && ME_ACC.hasPendingClaim;
  return `
    <div class="pay-box">
      <div class="pay-price"><b>${money(price)}</b><span>/ mes</span></div>
      <label for="pay-months">Periodo</label>
      <select id="pay-months">${opts}</select>
      <div class="form-actions">
        <button class="btn paypal" onclick="goPay()">💳 Pagar con PayPal</button>
        ${pending
          ? '<div class="hint center">⏳ Ya has avisado de un pago. El administrador lo confirmará en breve.</div>'
          : '<button class="btn ghost" onclick="claimPaid()">✅ Ya he pagado</button>'}
      </div>
      <p class="hint">El pago se hace en PayPal y vuelves aquí al terminar. Tu suscripción se activa en cuanto el administrador lo confirma.</p>
    </div>`;
}
function goPay(){
  const months = parseInt(document.getElementById('pay-months').value, 10) || 1;
  try{ localStorage.setItem('liguilla_pay_months', String(months)); }catch(e){}
  window.open(paypalPayLink(months), '_blank', 'noopener');
}
function claimPaid(auto){
  let months = 1;
  try{ months = parseInt(localStorage.getItem('liguilla_pay_months'), 10) || 1; }catch(e){}
  const sel = document.getElementById('pay-months');
  if(sel && !auto) months = parseInt(sel.value, 10) || months;
  api('me/claim', {method:'POST', body:{months}})
    .then(()=>{
      if(ME_ACC) ME_ACC.hasPendingClaim = true;
      showSyncIndicator('✅ Aviso de pago enviado');
      if(!auto) closeModal();
      renderSubscription(false);
    })
    .catch(err=>alert('No se pudo enviar el aviso: ' + err.message));
}
function openPaywall(){
  const st = ME_ACC ? ME_ACC.status : 'trial';
  const intro = st === 'due'
    ? `Tu periodo terminó el <b>${fmtLong(ME_ACC.expiresAt)}</b>. Puedes seguir usando la app hasta el <b>${fmtLong(ME_ACC.graceEndsAt)}</b>; después se bloqueará hasta renovar.`
    : st === 'trial'
      ? `Tu prueba gratuita termina el <b>${fmtLong(ME_ACC.expiresAt)}</b>. Suscríbete para seguir usando la app sin interrupciones.`
      : `Tu suscripción está activa hasta el <b>${fmtLong(ME_ACC && ME_ACC.expiresAt)}</b>. Puedes renovarla por adelantado.`;
  document.getElementById('modal-title').textContent = '⭐ Suscripción mensual';
  document.getElementById('modal-body').innerHTML = `<p class="hint" style="margin-bottom:6px;">${intro}</p>${payBoxHTML()}
    <div class="form-actions"><button class="btn ghost" onclick="closeModal()">Más tarde</button></div>`;
  document.getElementById('modal-bg').classList.add('open');
}

function renderSubBanner(){
  const el = document.getElementById('sub-banner');
  if(!el || !ME_ACC) return;
  const a = ME_ACC, warn = Number(APP_SETTINGS.warnDaysBefore) || 0;
  let html = '';
  if(a.hasPendingClaim && (a.status === 'due' || a.status === 'trial')){
    html = `<div class="sub-banner info">⏳ Pago avisado: pendiente de confirmación por el administrador.</div>`;
  } else if(a.status === 'due'){
    html = `<div class="sub-banner due" role="button" onclick="openPaywall()"><b>Tu periodo ha terminado.</b> Renueva por ${money(APP_SETTINGS.monthlyPrice)}/mes antes del ${fmtLong(a.graceEndsAt)}. <u>Pagar ahora</u></div>`;
  } else if(a.status === 'trial' && a.daysLeft <= warn){
    html = `<div class="sub-banner warn" role="button" onclick="openPaywall()">Tu prueba gratuita termina en <b>${a.daysLeft} ${a.daysLeft===1?'día':'días'}</b>. <u>Suscribirme</u></div>`;
  }
  el.innerHTML = html;
}

/* Bloqueo total si la cuenta está desactivada o la suscripción vencida */
function renderSubscription(first){
  renderSubBanner();
  const lock = document.getElementById('lock-screen');
  if(!ME_ACC || !lock) return;
  const st = ME_ACC.status;
  if(st === 'blocked' || st === 'disabled'){
    const contact = APP_SETTINGS.paypalEmail || '';
    document.getElementById('lock-body').innerHTML = st === 'disabled'
      ? `<h2>Cuenta desactivada</h2><p class="hint">El administrador ha desactivado esta cuenta. Si crees que es un error, escribe a <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a>.</p>`
      : `<h2>Renueva tu suscripción</h2><p class="hint">Tu periodo terminó el <b>${fmtLong(ME_ACC.expiresAt)}</b>. Tus datos están guardados: en cuanto se confirme el pago vuelves a tenerlo todo.</p>${payBoxHTML()}`;
    lock.classList.add('open');
  } else {
    lock.classList.remove('open');
    if(first && st === 'due'){
      const key = 'liguilla_paywall_seen';
      const today = new Date().toISOString().slice(0,10);
      let seen = ''; try{ seen = localStorage.getItem(key) || ''; }catch(e){}
      if(seen !== today && !ME_ACC.hasPendingClaim){ try{ localStorage.setItem(key, today); }catch(e){} openPaywall(); }
    }
  }
}

/* ---------- Importar rivales desde el Beniopen ---------- */
let BO_DATA = null;
const boSort = (x, y) => x.localeCompare(y, 'es', {sensitivity:'base'});

async function openBeniopenSetup(){
  document.getElementById('modal-title').textContent = '🎾 Configurar con el Beniopen';
  document.getElementById('modal-body').innerHTML = '<p class="hint">Cargando los jugadores del Beniopen…</p>';
  document.getElementById('modal-bg').classList.add('open');
  try{
    if(!BO_DATA) BO_DATA = await api('beniopen');
  }catch(err){
    console.warn('API beniopen no disponible, usando datos integrados:', err);
    BO_DATA = BO_STATIC_DATA;
  }
  if(!BO_DATA || !BO_DATA.groups || BO_DATA.groups.length === 0){
    BO_DATA = BO_STATIC_DATA;
  }
  paintBeniopenSetup();
}

function paintBeniopenSetup(){
  const groups = BO_DATA.groups || [];
  document.getElementById('modal-body').innerHTML = `
    <p class="hint" style="margin-top:0;">Elige tu categoría y tu nombre. La app añadirá a todos los demás jugadores de tu grupo como rivales. Después tendrás que ordenar tú las jornadas.</p>
    <label for="bo-group">Categoría / grupo</label>
    <select id="bo-group" onchange="boGroupChanged()">
      <option value="">— Elige tu grupo —</option>
      ${groups.map((g,i)=>`<option value="${i}">${escapeHtml(g.label)} (${g.players.length})</option>`).join('')}
    </select>
    <label for="bo-player">Tu nombre</label>
    <select id="bo-player" onchange="boPlayerChanged()" disabled><option value="">— Primero elige el grupo —</option></select>
    <div id="bo-preview" class="hint"></div>
    <div class="form-actions">
      <button class="btn primary" id="bo-go" onclick="beniopenImport()" disabled>✅ Importar mis rivales</button>
      <button class="btn ghost" onclick="beniopenManual()">No juego el Beniopen / lo haré a mano</button>
    </div>`;
  // si ya hay un nombre configurado, intenta preseleccionar su grupo
  if(CFG.playerName){
    const gi = groups.findIndex(g=>g.players.some(p=>p.toLowerCase() === CFG.playerName.toLowerCase()));
    if(gi > -1){ document.getElementById('bo-group').value = String(gi); boGroupChanged(); }
  }
}

function boGroupChanged(){
  const gi = document.getElementById('bo-group').value;
  const sel = document.getElementById('bo-player');
  if(gi === ''){ sel.disabled = true; sel.innerHTML = '<option value="">— Primero elige el grupo —</option>'; boPlayerChanged(); return; }
  const g = BO_DATA.groups[+gi];
  const mine = (CFG.playerName || '').toLowerCase();
  sel.disabled = false;
  sel.innerHTML = '<option value="">— Elige tu nombre —</option>' +
    g.players.slice().sort(boSort).map(p=>`<option value="${escapeHtml(p)}"${p.toLowerCase()===mine?' selected':''}>${escapeHtml(p)}</option>`).join('');
  boPlayerChanged();
}

function boPlayerChanged(){
  const gi = document.getElementById('bo-group').value;
  const me = document.getElementById('bo-player').value;
  const prev = document.getElementById('bo-preview'), go = document.getElementById('bo-go');
  if(gi === '' || !me){ prev.textContent = ''; go.disabled = true; return; }
  const n = BO_DATA.groups[+gi].players.length - 1;
  prev.innerHTML = `Se añadirán <b>${n} rivales</b> de ${escapeHtml(BO_DATA.groups[+gi].label)} y se enlazará la clasificación del grupo.`;
  go.disabled = false;
}

function beniopenManual(){
  try{ localStorage.setItem('liguilla_bo_skip', '1'); }catch(e){}
  closeModal();
  showView('ajustes');
}

function beniopenImport(){
  const gi = document.getElementById('bo-group').value;
  const me = document.getElementById('bo-player').value;
  if(gi === '' || !me) return;
  const g = BO_DATA.groups[+gi];
  const others = g.players.filter(n=>n !== me).sort(boSort);
  const hasData = Object.values(store.matches || {}).some(m=>m && (m.played || m.done || m.date || m.myScore != null || m.notes));
  if(isConfigured() && hasData && !confirm('Ya tienes partidos registrados. Al importar se sustituyen tus rivales y jornadas y se borrarán esos partidos. ¿Continuar?')) return;

  // conserva teléfono, email y ranking de los rivales que ya tenías
  const prev = {}; (CFG.opponents || []).forEach(o=>{ prev[o.name.toLowerCase()] = o; });
  const opponents = others.map(n=>{ const p = prev[n.toLowerCase()] || {}; return {name:n, phone:p.phone||'', email:p.email||'', ranking:p.ranking||null}; });
  // conserva el orden de jornadas de los rivales que ya estaban y añade el resto
  const kept = (CFG.fixture || []).filter(f=>others.includes(f.opp)).map(f=>({opp:f.opp, from:f.from||'', to:f.to||''}));
  const used = new Set(kept.map(f=>f.opp));
  const fixture = kept.concat(others.filter(n=>!used.has(n)).map(n=>({opp:n, from:'', to:''})));

  const clean = {
    playerName: me, myRanking: CFG.myRanking || null,
    tournament: BO_DATA.edition || CFG.tournament || '37º Beniopen', group: g.label,
    pointsWin: CFG.pointsWin, pointsLoss: CFG.pointsLoss, org: CFG.org,
    links: {clasificacion: g.url, resultados: (CFG.links && CFG.links.resultados) || ''},
    opponents, fixture, legacyGasUrl: CFG.legacyGasUrl || ''
  };
  store.matches = {};
  applyConfig(clean);
  save();
  api('me/config', {method:'PUT', body:{value: clean}}).catch(()=>{});
  window._boHint = true;
  try{ localStorage.removeItem('liguilla_bo_skip'); }catch(e){}
  closeModal();
  if(typeof refreshAll === 'function') refreshAll();
  showView('ajustes');
  renderAjustes();
  setTimeout(()=>{ const el = document.getElementById('fix-list'); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); }, 300);
}

/* ---------- Cambiar contraseña ---------- */
function openChangePassword(){
  document.getElementById('modal-title').textContent = '🔑 Cambiar contraseña';
  document.getElementById('modal-body').innerHTML = `
    <form onsubmit="event.preventDefault(); submitChangePassword();">
      <label for="pw-cur">Contraseña actual</label>
      <input type="password" id="pw-cur" autocomplete="current-password" required>
      <label for="pw-new">Nueva contraseña (mínimo 6 caracteres)</label>
      <input type="password" id="pw-new" autocomplete="new-password" minlength="6" required>
      <label for="pw-rep">Repite la nueva contraseña</label>
      <input type="password" id="pw-rep" autocomplete="new-password" minlength="6" required>
      <div id="pw-msg" class="hint" style="color:var(--loss);"></div>
      <div class="form-actions">
        <button class="btn primary" type="submit" id="pw-save">💾 Guardar</button>
        <button class="btn ghost" type="button" onclick="closeModal()">Cancelar</button>
      </div>
    </form>`;
  document.getElementById('modal-bg').classList.add('open');
}
async function submitChangePassword(){
  const cur = document.getElementById('pw-cur').value;
  const nw = document.getElementById('pw-new').value;
  const rep = document.getElementById('pw-rep').value;
  const msg = document.getElementById('pw-msg'), btn = document.getElementById('pw-save');
  if(nw.length < 6){ msg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; return; }
  if(nw !== rep){ msg.textContent = 'Las dos contraseñas nuevas no coinciden.'; return; }
  btn.disabled = true; msg.textContent = '';
  try{
    const d = await api('me/password', {method:'POST', body:{current: cur, password: nw}});
    window.Core.setToken(d.token);
    closeModal();
    showSyncIndicator('✅ Contraseña cambiada');
  }catch(err){
    msg.textContent = err.message;
  }finally{ btn.disabled = false; }
}

/* ---------- AJUSTES ---------- */
let draft = null;
function normUrl(u){
  u = String(u||'').trim();
  if(!u) return '';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}
function addDays(ymd, n){ const d = parseYMD(ymd); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function todayYMD(){ const d = new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }

function renderAjustes(){
  draft = JSON.parse(JSON.stringify(CFG));
  draft.opponents.forEach(o=>{ o._orig = o.name; o._cur = o.name; });
  draft.fixture.forEach((f,i)=>{ f._n = i+1; });
  paintAjustes();
}

function accountCardHTML(){
  if(!ME_ACC) return '';
  const a = ME_ACC;
  const label = {admin:'Administrador', trial:'Prueba gratuita', paid:'Suscripción activa', due:'Pendiente de pago', blocked:'Bloqueada', disabled:'Desactivada'}[a.status] || a.status;
  const cls = {admin:'win', trial:'sched', paid:'win', due:'loss', blocked:'loss', disabled:'loss'}[a.status] || 'todo';
  const until = a.status === 'admin' ? 'Sin vencimiento' : (a.status === 'trial' ? 'Prueba hasta el ' : 'Activa hasta el ') + fmtLong(a.expiresAt);
  return `<div class="card">
    <h3>Mi cuenta</h3>
    <div class="acc-line"><span>${escapeHtml(a.email)}</span><span class="pill ${cls}">${label}</span></div>
    <p class="hint">${until}${a.hasPendingClaim ? ' · ⏳ pago pendiente de confirmar' : ''}</p>
    <div class="row-actions">
      ${a.status !== 'admin' ? '<button class="btn primary small" onclick="openPaywall()">⭐ Suscripción</button>' : '<a class="btn court small" href="admin.html">🛠️ Panel admin</a>'}
      <button class="btn ghost small" onclick="openChangePassword()">🔑 Cambiar contraseña</button>
      <button class="btn ghost small" onclick="window.Auth.logout()">🚪 Cerrar sesión</button>
      ${a.status !== 'admin' ? '<button class="btn ghost small danger" onclick="openDeleteMyAccount()" style="margin-top:4px;width:100%;">🗑️ Eliminar mi cuenta</button>' : ''}
    </div>
  </div>`;
}

function openDeleteMyAccount(){
  if(!ME_ACC) return;
  const email = ME_ACC.email;
  document.getElementById('modal-title').textContent = '⚠️ Eliminar mi cuenta';
  document.getElementById('modal-body').innerHTML = `
    <p class="hint" style="color:var(--loss);font-weight:700;">Esta acción es <b>irreversible</b>. Se borrarán permanentemente tu cuenta, tus partidos y todos tus datos.</p>
    <p class="hint">Para confirmar, escribe tu email: <b>${escapeHtml(email)}</b></p>
    <label for="del-email-confirm">Tu email</label>
    <input type="email" id="del-email-confirm" placeholder="${escapeHtml(email)}" autocomplete="off">
    <div id="del-msg" class="hint" style="color:var(--loss);margin-top:6px;"></div>
    <div class="form-actions">
      <button class="btn ghost danger" onclick="submitDeleteMyAccount()">🗑️ Sí, eliminar mi cuenta</button>
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
    </div>`;
  document.getElementById('modal-bg').classList.add('open');
}

async function submitDeleteMyAccount(){
  const email = ME_ACC && ME_ACC.email;
  const typed = (document.getElementById('del-email-confirm') || {}).value || '';
  const msgEl = document.getElementById('del-msg');
  if(typed.trim().toLowerCase() !== (email||'').toLowerCase()){
    if(msgEl) msgEl.textContent = 'El email no coincide. Escríbelo exactamente.';
    return;
  }
  if(msgEl) msgEl.textContent = 'Eliminando cuenta…';
  try{
    await api('me', {method:'DELETE'});
    Core.setToken(null);
    try{ localStorage.removeItem(lsKey); }catch(e){}
    location.href = location.pathname;
  }catch(err){
    if(msgEl) msgEl.textContent = 'Error: ' + err.message;
  }
}


function paintAjustes(){
  const el = document.getElementById('ajustes-body');
  if(!el || !draft) return;
  const d = draft;
  const v = x => escapeHtml(x == null ? '' : x);
  const oppOptions = sel => '<option value="">— Rival —</option>' + d.opponents.filter(o=>o.name).map(o=>`<option value="${v(o.name)}"${o.name===sel?' selected':''}>${v(o.name)}</option>`).join('');
  el.innerHTML = `
    ${accountCardHTML()}
    ${window._boHint ? '<div class="card" style="border:2px solid var(--court);"><b>✅ Rivales importados del Beniopen.</b><p class="hint" style="margin:6px 0 0;">Ahora ordena tus jornadas: en "Jornadas" elige el rival de cada una (o usa ↑ ↓) y las fechas, y pulsa <b>Guardar ajustes</b>.</p></div>' : ''}
    <div class="card">
      <h3>Beniopen</h3>
      <p class="hint">Si juegas el Beniopen, elige tu categoría y tu nombre: la app descarga a tus rivales de beniopen.es.</p>
      <button type="button" class="btn court small" style="width:100%;" onclick="openBeniopenSetup()">🎾 Importar rivales desde el Beniopen</button>
    </div>
    <div class="card">
      <h3>Mis datos</h3>
      <label for="cfg-name">Tu nombre (como aparece en el torneo)</label>
      <input type="text" id="cfg-name" value="${v(d.playerName)}" placeholder="Nombre y apellido">
      <label for="cfg-rank">Tu posición en el ranking (opcional)</label>
      <input type="number" inputmode="numeric" id="cfg-rank" value="${v(d.myRanking)}" placeholder="Ej: 146">
    </div>

    <div class="card">
      <h3>Torneo</h3>
      <label for="cfg-tourn">Nombre del torneo</label>
      <input type="text" id="cfg-tourn" value="${v(d.tournament)}" placeholder="Ej: 37º Beniopen">
      <label for="cfg-group">Categoría / grupo</label>
      <input type="text" id="cfg-group" value="${v(d.group)}" placeholder="Ej: Segunda B">
      <div class="inputs2col">
        <div><label for="cfg-pw">Puntos por victoria</label><input type="number" inputmode="numeric" id="cfg-pw" value="${v(d.pointsWin)}"></div>
        <div><label for="cfg-pl">Puntos por derrota</label><input type="number" inputmode="numeric" id="cfg-pl" value="${v(d.pointsLoss)}"></div>
      </div>
    </div>

    <div class="card">
      <h3>Organización</h3>
      <p class="hint">Reciben una copia de tus resultados por WhatsApp o email.</p>
      <label for="cfg-org-phone">Teléfono (WhatsApp)</label>
      <input type="tel" id="cfg-org-phone" value="${v(d.org.phone)}" placeholder="Ej: 34637207632">
      <label for="cfg-org-email">Email</label>
      <input type="email" id="cfg-org-email" value="${v(d.org.email)}" placeholder="organizacion@ejemplo.com">
    </div>

    <div class="card">
      <h3>Enlaces</h3>
      <p class="hint">Se abren dentro de la app, sin salir, desde los botones de Inicio.</p>
      <label for="cfg-link-clasificacion">Clasificación</label>
      <input type="url" id="cfg-link-clasificacion" value="${v(d.links.clasificacion)}" placeholder="https://…">
      <label for="cfg-link-resultados">Resultados</label>
      <input type="url" id="cfg-link-resultados" value="${v(d.links.resultados)}" placeholder="https://…">
    </div>

    <div class="card">
      <h3>Rivales <span class="count">(${d.opponents.length})</span></h3>
      <div id="opp-list">
        ${d.opponents.map((o,i)=>`
          <div class="cfg-row" data-i="${i}">
            <div class="cfg-row-head"><b>Rival ${i+1}</b><button type="button" class="set-remove" onclick="delOpp(${i})">✕ quitar</button></div>
            <input type="text" class="o-name" value="${v(o.name)}" placeholder="Nombre">
            <div class="inputs2col">
              <input type="tel" class="o-phone" value="${v(o.phone)}" placeholder="Teléfono">
              <input type="number" inputmode="numeric" class="o-rank" value="${v(o.ranking)}" placeholder="Ranking">
            </div>
            <input type="email" class="o-email" value="${v(o.email)}" placeholder="Email">
          </div>`).join('') || '<p class="hint">Todavía no hay rivales.</p>'}
      </div>
      <button type="button" class="btn ghost small" style="width:100%; margin-top:8px;" onclick="addOpp()">➕ Añadir rival</button>
    </div>

    <div class="card">
      <h3>Jornadas <span class="count">(${d.fixture.length})</span></h3>
      <p class="hint">Cada jornada tiene un rival y un rango de fechas para jugar el partido.</p>
      <div id="fix-list">
        ${d.fixture.map((f,i)=>`
          <div class="cfg-row" data-i="${i}">
            <div class="cfg-row-head"><b>Jornada ${i+1}</b>
              <span>${i>0?`<button type="button" class="set-remove" onclick="moveJornada(${i},-1)" aria-label="Subir">↑</button>`:''}
              ${i<d.fixture.length-1?`<button type="button" class="set-remove" onclick="moveJornada(${i},1)" aria-label="Bajar">↓</button>`:''}
              <button type="button" class="set-remove" onclick="delJornada(${i})">✕ quitar</button></span></div>
            <select class="f-opp">${oppOptions(f.opp)}</select>
            <div class="inputs2col">
              <div><label>Desde</label><input type="date" class="f-from" value="${v(f.from)}"></div>
              <div><label>Hasta</label><input type="date" class="f-to" value="${v(f.to)}"></div>
            </div>
          </div>`).join('') || '<p class="hint">Todavía no hay jornadas.</p>'}
      </div>
      <div class="row-actions">
        <button type="button" class="btn ghost small" onclick="addJornada()">➕ Añadir jornada</button>
        <button type="button" class="btn ghost small" onclick="fixtureFromOpps()">🔁 Una por rival</button>
      </div>
      <div class="custom-court-box" style="margin-top:12px;">
        <b style="font-size:14.5px;">Asignar fechas automáticamente</b>
        <div class="inputs2col">
          <div><label for="gen-start">Primer día</label><input type="date" id="gen-start" value="${v((d.fixture[0] && d.fixture[0].from) || todayYMD())}"></div>
          <div><label for="gen-days">Días por jornada</label><input type="number" inputmode="numeric" id="gen-days" value="7" min="1"></div>
        </div>
        <button type="button" class="btn court small" style="width:100%; margin-top:10px;" onclick="genDates()">📆 Rellenar fechas de todas las jornadas</button>
      </div>
    </div>

    <div class="card">
      <h3>Copia de seguridad</h3>
      <p class="hint">Descarga tus datos o recupéralos desde un archivo.</p>
      <div class="row-actions">
        <button type="button" class="btn ghost small" onclick="exportBackup()">⬇️ Descargar copia</button>
        <button type="button" class="btn ghost small" onclick="document.getElementById('import-file').click()">⬆️ Restaurar copia</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" style="display:none" onchange="importBackup(this)">
      ${d.legacyGasUrl ? `<button type="button" class="btn ghost small" style="width:100%; margin-top:8px;" onclick="importLegacy()">☁️ Importar partidos de la versión anterior (Google Script)</button>` : ''}
    </div>

    <div class="save-bar"><button class="btn primary" onclick="saveAjustes()">💾 Guardar ajustes</button></div>
  `;
}

/* Lee el formulario al borrador, siguiendo los cambios de nombre de los rivales */
function collectDraft(){
  const el = document.getElementById('ajustes-body');
  if(!el || !draft) return;
  const val = id => { const x = document.getElementById(id); return x ? x.value.trim() : ''; };
  const num = s => { const n = parseInt(s, 10); return isNaN(n) ? null : n; };
  draft.playerName = val('cfg-name');
  draft.myRanking = num(val('cfg-rank'));
  draft.tournament = val('cfg-tourn');
  draft.group = val('cfg-group');
  draft.pointsWin = num(val('cfg-pw')) ?? 3;
  draft.pointsLoss = num(val('cfg-pl')) ?? 1;
  draft.org = {phone: val('cfg-org-phone'), email: val('cfg-org-email')};
  draft.links = {clasificacion: normUrl(val('cfg-link-clasificacion')), resultados: normUrl(val('cfg-link-resultados'))};
  el.querySelectorAll('#opp-list .cfg-row').forEach(row=>{
    const o = draft.opponents[+row.dataset.i];
    o.name = row.querySelector('.o-name').value.trim();
    o.phone = row.querySelector('.o-phone').value.trim();
    o.email = row.querySelector('.o-email').value.trim();
    o.ranking = num(row.querySelector('.o-rank').value);
  });
  el.querySelectorAll('#fix-list .cfg-row').forEach(row=>{
    const f = draft.fixture[+row.dataset.i];
    f.opp = row.querySelector('.f-opp').value;
    f.from = row.querySelector('.f-from').value;
    f.to = row.querySelector('.f-to').value;
  });
  draft.opponents.forEach(o=>{
    if(o._cur && o._cur !== o.name){
      draft.fixture.forEach(f=>{ if(f.opp === o._cur) f.opp = o.name; });
      o._cur = o.name;
    }
  });
}
function addOpp(){
  collectDraft();
  draft.opponents.push({name:'', phone:'', email:'', ranking:null, _cur:''});
  paintAjustes();
  const rows = document.querySelectorAll('#opp-list .o-name');
  if(rows.length) rows[rows.length-1].focus();
}
function delOpp(i){
  collectDraft();
  const o = draft.opponents[i];
  if(o.name && !confirm('¿Quitar a '+o.name+' de tus rivales?')) return;
  draft.opponents.splice(i,1);
  paintAjustes();
}
function addJornada(){
  collectDraft();
  const last = draft.fixture[draft.fixture.length-1];
  const from = last && last.to ? addDays(last.to, 1) : '';
  const used = new Set(draft.fixture.map(f=>f.opp));
  const free = draft.opponents.find(o=>o.name && !used.has(o.name));
  draft.fixture.push({opp: free ? free.name : '', from, to: from ? addDays(from, 6) : ''});
  paintAjustes();
}
function delJornada(i){
  collectDraft();
  const f = draft.fixture[i];
  const m = f._n && store.matches[f._n];
  if(m && (m.played || m.date) && !confirm('Esta jornada tiene un partido programado o jugado. ¿Quitarla igualmente?')) return;
  draft.fixture.splice(i,1);
  paintAjustes();
}
function moveJornada(i, dir){
  collectDraft();
  const j = i + dir;
  if(j < 0 || j >= draft.fixture.length) return;
  const a = draft.fixture[i], b = draft.fixture[j];
  draft.fixture[i] = b; draft.fixture[j] = a;
  // las fechas se quedan en su posición, el rival (y su partido) se mueve
  [a.from, b.from] = [b.from, a.from]; [a.to, b.to] = [b.to, a.to];
  paintAjustes();
}
function fixtureFromOpps(){
  collectDraft();
  const used = new Set(draft.fixture.map(f=>f.opp));
  let added = 0;
  draft.opponents.forEach(o=>{
    if(!o.name || used.has(o.name)) return;
    const last = draft.fixture[draft.fixture.length-1];
    const from = last && last.to ? addDays(last.to, 1) : '';
    draft.fixture.push({opp:o.name, from, to: from ? addDays(from, 6) : ''});
    added++;
  });
  paintAjustes();
  showSyncIndicator(added ? added+' jornadas añadidas' : 'Todos los rivales ya tienen jornada');
}
function genDates(){
  collectDraft();
  const start = document.getElementById('gen-start').value;
  const days = Math.max(parseInt(document.getElementById('gen-days').value, 10) || 7, 1);
  if(!start){ alert('Elige el primer día.'); return; }
  draft.fixture.forEach((f,i)=>{ f.from = addDays(start, i*days); f.to = addDays(start, i*days + days - 1); });
  paintAjustes();
}

function saveAjustes(){
  collectDraft();
  const d = draft;
  if(!d.playerName){ alert('Escribe tu nombre.'); document.getElementById('cfg-name').focus(); return; }
  const names = d.opponents.map(o=>o.name);
  if(names.some(n=>!n)){ alert('Hay un rival sin nombre: escríbelo o quítalo.'); return; }
  if(new Set(names.map(n=>n.toLowerCase())).size !== names.length){ alert('Hay dos rivales con el mismo nombre.'); return; }
  const bad = d.fixture.findIndex(f=>!f.opp || !names.includes(f.opp));
  if(bad > -1){ alert('Elige el rival de la jornada '+(bad+1)+'.'); return; }
  const badDate = d.fixture.findIndex(f=>f.from && f.to && f.to < f.from);
  if(badDate > -1){ alert('En la jornada '+(badDate+1)+' la fecha final es anterior a la inicial.'); return; }

  // Notas privadas: siguen al rival aunque cambie de nombre
  d.opponents.forEach(o=>{
    if(o._orig && o._orig !== o.name && store.privNotes[o._orig] !== undefined){
      store.privNotes[o.name] = store.privNotes[o._orig];
      delete store.privNotes[o._orig];
    }
  });
  // Partidos: siguen a su jornada aunque se reordenen o se borren otras
  const newMatches = {};
  d.fixture.forEach((f,i)=>{
    const m = f._n ? store.matches[f._n] : null;
    if(m){ newMatches[i+1] = Object.assign({}, m, {n:i+1, opp:f.opp}); }
  });
  store.matches = newMatches;

  const clean = JSON.parse(JSON.stringify(d, (k,val)=> k.startsWith('_') ? undefined : val));
  clean.fixture = clean.fixture.map(f=>({opp:f.opp, from:f.from||'', to:f.to||''}));
  window._boHint = false;
  applyConfig(clean);
  save();
  showSyncIndicator('Guardando ajustes…');
  api('me/config', {method:'PUT', body:{value: clean}})
    .then(()=>{ showSyncIndicator('✅ Ajustes guardados'); renderAjustes(); refreshAll(); })
    .catch(err=>alert('No se pudieron guardar los ajustes: ' + err.message));
}

function exportBackup(){
  const data = JSON.stringify({app:'mi-liguilla', version:1, exportedAt:new Date().toISOString(), config:CFG, store}, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], {type:'application/json'}));
  a.download = 'mi-liguilla-' + todayYMD() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
}
function importBackup(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const o = JSON.parse(reader.result);
      const hasCfg = o && o.config && typeof o.config === 'object';
      const st = (o && o.store) || (o && o.matches ? o : null);
      if(!hasCfg && !st) throw new Error('formato desconocido');
      if(!confirm('¿Sustituir tus datos actuales por los de la copia?')) return;
      if(st){ store = normalizeStore(st); save(); }
      if(hasCfg){ applyConfig(o.config); api('me/config', {method:'PUT', body:{value: CFG}}).catch(()=>{}); }
      renderAjustes(); refreshAll();
      showSyncIndicator('✅ Copia restaurada');
    }catch(e){ alert('El archivo no es una copia válida (' + e.message + ').'); }
    finally{ input.value = ''; }
  };
  reader.readAsText(file);
}
/* Trae los partidos guardados en la antigua versión de Google Apps Script */
function importLegacy(){
  const url = CFG.legacyGasUrl;
  if(!url) return;
  showSyncIndicator('Conectando con Google…');
  fetch(url + '?api=load&t=' + Date.now())
    .then(r=>r.json())
    .then(res=>{
      if(!res || !res.success || !res.data) throw new Error('no hay datos');
      const old = normalizeStore(JSON.parse(res.data));
      const n = Object.keys(old.matches).length;
      if(!confirm('Se han encontrado ' + n + ' partidos y ' + Object.keys(old.privNotes).length + ' notas privadas. ¿Importarlos sustituyendo los actuales?')) return;
      Object.values(old.matches).forEach(m=>{ delete m.eventId; m.eventInvited = false; });
      store = normalizeStore(Object.assign({}, old, {_rev: Date.now()}));
      save(); refreshAll();
      showSyncIndicator('✅ Datos importados');
    })
    .catch(err=>alert('No se pudo importar: ' + err.message));
}

/* ---------- PWA: service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').catch(function(error){ console.warn('Service Worker no registrado:', error); });
  });
}

/* ---------- Arranque (lo llama main.js tras iniciar sesión) ---------- */
window.bootApp = function(me){
  lsKey = 'liguilla_data_' + me.account.id;
  try{ const raw = localStorage.getItem(lsKey); if(raw) store = JSON.parse(raw); }catch(e){}
  store = normalizeStore(store);

  /* Si viene de onboarding Beniopen, el config ya está en _pendingBeniopenConfig */
  if(window._pendingBeniopenConfig){
    applyConfig(window._pendingBeniopenConfig);
    delete window._pendingBeniopenConfig;
  } else {
    applyConfig(me.config);
  }

  applyRemote(me, true);
  setSyncStatus(true, 'conectado a las ' + hhmm());

  if(/[?&]pago=ok/.test(location.search)){
    history.replaceState(null, '', location.pathname);
    if(!ME_ACC.hasPendingClaim && ME_ACC.status !== 'admin') claimPaid(true);
  }
  if(!isConfigured()){
    showView('ajustes');
    let skip = false; try{ skip = localStorage.getItem('liguilla_bo_skip') === '1'; }catch(e){}
    if(!skip) setTimeout(openBeniopenSetup, 400);
  }

  let syncTimer = setInterval(()=>loadRemote(false), 60000);
  document.addEventListener('visibilitychange', function(){
    clearInterval(syncTimer);
    if(!document.hidden){ loadRemote(false); syncTimer = setInterval(()=>loadRemote(false), 60000); }
  });
  window.addEventListener('online', ()=>loadRemote(false));
};
