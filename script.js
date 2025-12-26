// script.js
// Last Call Dispatch Operator - Fase 1: fila + atendimento + despacho manual
// (com efeito máquina de escrever e severidades: trote/leve/médio/grave)

const $ = (id) => document.getElementById(id);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

// ===== Typewriter (máquina de escrever) =====
let typingToken = 0;
async function typeWriter(el, text, speedMs){
  const token = ++typingToken;
  el.textContent = "";
  for(let i=0;i<text.length;i++){
    if(token !== typingToken) return;
    el.textContent += text[i];
    await new Promise(r => setTimeout(r, speedMs));
  }
}

// ===== Log =====
function logLine(msg){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  const ss = String(now.getSeconds()).padStart(2,"0");
  const line = `[${hh}:${mm}:${ss}] ${msg}\n`;
  const logEl = $("log");
  if(logEl) logEl.textContent = line + logEl.textContent;
}

// ===== Verify data =====
function verifyDataLoaded(){
  if(!window.CITIES || !Array.isArray(window.CITIES) || window.CITIES.length === 0){
    logLine("❌ ERRO: data/cities.js não carregou ou está vazio.");
    return false;
  }
  if(!window.CALLS || !Array.isArray(window.CALLS) || window.CALLS.length === 0){
    logLine("❌ ERRO: data/calls.js não carregou ou está vazio.");
    return false;
  }
  return true;
}

// ===== UI refs =====
const ui = {
  citySelect: $("citySelect"),
  agencySelect: $("agencySelect"),
  difficultySelect: $("difficultySelect"),
  btnStart: $("btnStartShift"),
  btnEnd: $("btnEndShift"),

  hudShift: $("hudShift"),
  hudTime: $("hudTime"),
  hudScore: $("hudScore"),
  hudQueue: $("hudQueue"),

  pillStatus: $("pillStatus"),
  pillCallTimer: $("pillCallTimer"),

  unitsList: $("unitsList"),
  queueList: $("queueList"),

  callMeta: $("callMeta"),
  callText: $("callText"),
  btnAnswer: $("btnAnswer"),
  btnHold: $("btnHold"),

  dispatchInfo: $("dispatchInfo"),
  dispatchUnitSelect: $("dispatchUnitSelect"),
  btnDispatch: $("btnDispatch"),
  btnDismiss: $("btnDismiss"),

  shiftSummary: $("shiftSummary"),
};

function severityClass(sev){
  if(sev === "leve") return "leve";
  if(sev === "medio") return "medio";
  if(sev === "grave") return "grave";
  return "trote";
}

function difficultyParams(diff){
  if(diff === "easy"){
    return { spawnBase: 18, callTTL: 36, typeSpeed: 18, scoreMult: 0.9 };
  }
  if(diff === "hard"){
    return { spawnBase: 10, callTTL: 22, typeSpeed: 10, scoreMult: 1.2 };
  }
  return { spawnBase: 14, callTTL: 28, typeSpeed: 14, scoreMult: 1.0 };
}

// ===== Game State =====
const state = {
  running: false,
  cityId: null,
  agency: "police",
  difficulty: "normal",

  shiftSeconds: 0,
  shiftDuration: 240, // 4 minutos por enquanto
  spawnTimer: 0,

  queue: [], // {call, createdAt, ttl}
  current: null,
  currentTTL: 0,

  score: 0,
  stats: { handled:0, correct:0, wrong:0, pranks:0, expired:0 },

  units: []
};

// ===== Buttons refresher (MOBILE ROBUST) =====
function refreshButtons(){
  const canAnswer = state.running && !state.current && state.queue.length > 0;
  const hasCurrent = state.running && !!state.current;

  ui.btnAnswer.disabled = !canAnswer;

  ui.btnHold.disabled = !hasCurrent;

  ui.dispatchUnitSelect.disabled = !hasCurrent;
  ui.btnDispatch.disabled = !hasCurrent;
  ui.btnDismiss.disabled = !hasCurrent;

  // info pills
  ui.pillStatus.textContent = state.running ? "Turno em andamento" : "Turno parado";
  if(!state.current){
    ui.pillCallTimer.textContent = "Sem chamada";
  }
}

// ===== Cities + Units =====
function getCity(){
  return window.CITIES.find(c => c.id === state.cityId) || window.CITIES[0];
}

function populateCities(){
  ui.citySelect.innerHTML = "";
  window.CITIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    ui.citySelect.appendChild(opt);
  });
  ui.citySelect.value = window.CITIES[0].id;
}

function rebuildUnits(){
  const city = getCity();
  const list = (city.units && city.units[state.agency]) ? city.units[state.agency] : [];

  state.units = list.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    status: "Disponível"
  }));

  renderUnits();
  rebuildDispatchSelect();
}

function renderUnits(){
  ui.unitsList.innerHTML = "";
  if(state.units.length === 0){
    ui.unitsList.innerHTML = `<div class="hint">Nenhuma unidade configurada para esta cidade/agência.</div>`;
    return;
  }

  state.units.forEach(u => {
    const div = document.createElement("div");
    div.className = "unitRow";
    div.innerHTML = `
      <div class="unitName">${u.name}</div>
      <div class="unitRole">${u.role}</div>
      <div class="unitState">Status: <b>${u.status}</b></div>
    `;
    ui.unitsList.appendChild(div);
  });
}

function rebuildDispatchSelect(){
  ui.dispatchUnitSelect.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Selecione a unidade";
  ui.dispatchUnitSelect.appendChild(opt0);

  state.units.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    ui.dispatchUnitSelect.appendChild(opt);
  });
}

// ===== Calls =====
function pickCall(){
  const progress = state.shiftSeconds / state.shiftDuration;

  // mais trote no começo, mais grave no final
  const weights = {
    trote: clamp(0.30 - progress*0.15, 0.12, 0.30),
    leve:  clamp(0.35 - progress*0.10, 0.15, 0.35),
    medio: clamp(0.25 + progress*0.05, 0.20, 0.35),
    grave: clamp(0.10 + progress*0.20, 0.12, 0.45),
  };

  const scored = window.CALLS.map(call => ({
    call,
    w: weights[call.severity] ?? 0.2
  }));

  const sum = scored.reduce((a,b)=>a+b.w,0) || 1;
  let r = Math.random() * sum;
  for(const it of scored){
    r -= it.w;
    if(r <= 0) return it.call;
  }
  return scored[0]?.call || window.CALLS[0];
}

function enqueueCall(){
  const params = difficultyParams(state.difficulty);
  const call = pickCall();
  const ttl = params.callTTL;

  state.queue.push({ call, createdAt: state.shiftSeconds, ttl });
  logLine(`📥 Nova chamada: "${call.title}" (${call.severity.toUpperCase()})`);
  renderQueue();
  refreshButtons(); // <- garante que “Atender próxima” habilita imediatamente
}

function renderQueue(){
  ui.hudQueue.textContent = String(state.queue.length);

  if(state.queue.length === 0){
    ui.queueList.textContent = "—";
    return;
  }

  ui.queueList.innerHTML = "";
  state.queue.slice(0, 8).forEach((q, idx) => {
    const age = state.shiftSeconds - q.createdAt;
    const remain = Math.max(0, q.ttl - age);

    const div = document.createElement("div");
    div.className = "queueItem";
    div.innerHTML = `
      <div>
        <div class="queueTitle">${idx+1}. ${q.call.title}</div>
        <div class="queueSub">Restante: ${formatTime(remain)} • Tipo: ${q.call.severity}</div>
      </div>
      <div class="badge ${severityClass(q.call.severity)}">${q.call.severity.toUpperCase()}</div>
    `;
    ui.queueList.appendChild(div);
  });
}

function setCurrentFromQueue(){
  if(state.current) return;
  const next = state.queue.shift();
  if(!next) return;

  state.current = next.call;
  state.currentTTL = next.ttl;

  updateCurrentUI(true);
  renderQueue();
  refreshButtons();
}

function updateCurrentUI(isNew){
  const city = getCity();

  if(!state.current){
    ui.callMeta.textContent = "—";
    ui.dispatchInfo.textContent = "—";
    ui.callText.textContent = "Aguardando chamadas...";
    ui.dispatchUnitSelect.value = "";
    refreshButtons();
    return;
  }

  const greet = (state.agency === "police") ? city.greetingPolice : city.greetingFire;
  const sev = state.current.severity;

  ui.callMeta.textContent = `Linha: ${greet} • Caso: ${state.current.title} • Gravidade: ${sev.toUpperCase()}`;
  ui.dispatchInfo.textContent = `Selecione a unidade adequada para "${state.current.title}" (${sev.toUpperCase()})`;

  if(isNew){
    const params = difficultyParams(state.difficulty);
    const fullText = `${greet}\n\nChamador: ${state.current.text}`;
    typeWriter(ui.callText, fullText, params.typeSpeed);
  }

  refreshButtons();
}

// ===== Score / Resolve =====
function addScore(delta){
  state.score += delta;
  ui.hudScore.textContent = String(state.score);
}

function resolveCall(unitId, action){
  if(!state.current) return;

  const params = difficultyParams(state.difficulty);
  const mult = params.scoreMult;

  const call = state.current;
  const city = getCity();
  const isPrank = call.severity === "trote";

  const cityUnits = new Set((city.units[state.agency] || []).map(u => u.id));
  const recommended = (call.recommended?.[state.agency] || []).filter(id => cityUnits.has(id));

  let delta = 0;
  let result = "";

  if(action === "dismiss"){
    if(isPrank){
      delta = Math.floor(20 * mult);
      state.stats.pranks++;
      state.stats.correct++;
      result = `✅ Trote encerrado corretamente. +${delta} pts`;
    } else {
      delta = -Math.floor(35 * mult);
      state.stats.wrong++;
      result = `❌ Encerrado sem despacho em caso REAL. ${delta} pts`;
    }
  } else {
    if(isPrank){
      delta = -Math.floor(30 * mult);
      state.stats.wrong++;
      state.stats.pranks++;
      result = `⚠️ Era trote. Recursos desperdiçados. ${delta} pts`;
    } else {
      const ok = recommended.includes(unitId) || (recommended.length === 0 && !!unitId);
      if(ok){
        const base = (call.severity === "leve") ? 18 : (call.severity === "medio" ? 28 : 45);
        delta = Math.floor(base * mult);
        state.stats.correct++;
        result = `✅ Unidade correta. +${delta} pts`;
      } else {
        const base = (call.severity === "leve") ? 18 : (call.severity === "medio" ? 28 : 55);
        delta = -Math.floor(base * mult);
        state.stats.wrong++;
        result = `❌ Unidade errada. ${delta} pts`;
      }
    }
  }

  state.stats.handled++;
  addScore(delta);
  logLine(`${result} (Caso: ${call.title})`);

  state.current = null;
  state.currentTTL = 0;
  ui.dispatchUnitSelect.value = "";

  updateCurrentUI(false);
  renderQueue();
  updateSummary();
  refreshButtons();
}

// ===== HUD/Summary =====
function updateHUD(){
  ui.hudShift.textContent = state.running ? "ATIVO" : "—";
  ui.hudTime.textContent = formatTime(state.shiftSeconds);
  ui.hudQueue.textContent = String(state.queue.length);
}

function updateSummary(){
  if(!state.running && state.shiftSeconds === 0){
    ui.shiftSummary.textContent = "Nenhum turno ativo.";
    return;
  }

  ui.shiftSummary.innerHTML =
`<b>Resumo:</b><br>
• Chamadas atendidas: <b>${state.stats.handled}</b><br>
• Acertos: <b>${state.stats.correct}</b><br>
• Erros: <b>${state.stats.wrong}</b><br>
• Trotes: <b>${state.stats.pranks}</b><br>
• Expiradas: <b>${state.stats.expired}</b><br>
• Pontuação: <b>${state.score}</b>`;
}

// ===== Shift Loop =====
let interval = null;

function tick(){
  if(!state.running) return;

  state.shiftSeconds++;
  updateHUD();

  const params = difficultyParams(state.difficulty);

  // spawn
  state.spawnTimer++;
  if(state.spawnTimer >= params.spawnBase){
    state.spawnTimer = 0;
    enqueueCall();
    const extraChance = (state.difficulty === "hard") ? 0.35 : 0.15;
    if(Math.random() < extraChance) enqueueCall();
  }

  // expira fila
  const before = state.queue.length;
  state.queue = state.queue.filter(q => {
    const age = state.shiftSeconds - q.createdAt;
    const remain = q.ttl - age;
    if(remain <= 0){
      state.stats.expired++;
      logLine(`⛔ Chamada expirou na fila: "${q.call.title}" (-10 pts)`);
      addScore(-10);
      return false;
    }
    return true;
  });
  if(before !== state.queue.length) renderQueue();

  // TTL chamada atual
  if(state.current){
    state.currentTTL--;
    ui.pillCallTimer.textContent = `Tempo da chamada: ${formatTime(state.currentTTL)}`;
    if(state.currentTTL <= 0){
      logLine(`⛔ Você demorou demais. Chamada perdida: "${state.current.title}" (-20 pts)`);
      state.stats.expired++;
      addScore(-20);
      state.current = null;
      state.currentTTL = 0;
      updateCurrentUI(false);
    }
  } else {
    ui.pillCallTimer.textContent = "Sem chamada";
  }

  // fim do turno
  if(state.shiftSeconds >= state.shiftDuration){
    endShift();
  }

  refreshButtons();
}

function startShift(){
  if(state.running) return;

  state.cityId = ui.citySelect.value;
  state.agency = ui.agencySelect.value;
  state.difficulty = ui.difficultySelect.value;

  state.running = true;
  state.shiftSeconds = 0;
  state.spawnTimer = 0;
  state.queue = [];
  state.current = null;
  state.currentTTL = 0;
  state.score = 0;
  state.stats = { handled:0, correct:0, wrong:0, pranks:0, expired:0 };

  ui.btnStart.disabled = true;
  ui.btnEnd.disabled = false;
  ui.citySelect.disabled = true;
  ui.agencySelect.disabled = true;
  ui.difficultySelect.disabled = true;

  rebuildUnits();
  updateHUD();
  updateSummary();

  logLine(`✅ Turno iniciado em ${getCity().name} • Agência: ${state.agency} • Dificuldade: ${state.difficulty}`);

  enqueueCall();
  enqueueCall();
  renderQueue();
  updateCurrentUI(false);

  if(interval) clearInterval(interval);
  interval = setInterval(tick, 1000);

  refreshButtons();
}

function endShift(){
  if(!state.running) return;

  state.running = false;

  ui.btnStart.disabled = false;
  ui.btnEnd.disabled = true;
  ui.citySelect.disabled = false;
  ui.agencySelect.disabled = false;
  ui.difficultySelect.disabled = false;

  ui.btnAnswer.disabled = true;
  ui.btnHold.disabled = true;
  ui.btnDispatch.disabled = true;
  ui.btnDismiss.disabled = true;
  ui.dispatchUnitSelect.disabled = true;

  ui.pillStatus.textContent = "Turno finalizado";
  ui.pillCallTimer.textContent = "—";

  logLine(`🏁 Turno encerrado. Pontuação final: ${state.score}`);
  updateSummary();

  if(interval){
    clearInterval(interval);
    interval = null;
  }

  refreshButtons();
}

// ===== Actions =====
function answerNext(){
  if(!state.running) return;
  if(state.current) return;
  if(state.queue.length === 0) return;

  logLine("📞 Atendendo próxima chamada...");
  setCurrentFromQueue();
  refreshButtons();
}

function holdCall(){
  if(!state.running) return;
  if(!state.current) return;

  const call = state.current;
  const ttlBack = Math.max(10, state.currentTTL - 6);
  state.queue.unshift({ call, createdAt: state.shiftSeconds, ttl: ttlBack });

  logLine(`⏸ Chamada em espera: "${call.title}" (tempo reduzido)`);
  state.current = null;
  state.currentTTL = 0;

  updateCurrentUI(false);
  renderQueue();
  refreshButtons();
}

function dispatchSelected(){
  if(!state.running) return;
  if(!state.current) return;

  const unitId = ui.dispatchUnitSelect.value;
  if(!unitId){
    alert("Selecione uma unidade antes de despachar.");
    return;
  }
  resolveCall(unitId, "dispatch");
  refreshButtons();
}

function dismissCall(){
  if(!state.running) return;
  if(!state.current) return;

  resolveCall("", "dismiss");
  refreshButtons();
}

// ===== Mobile tap helpers =====
function bindTap(el, fn){
  if(!el) return;
  el.addEventListener("click", (e) => { e.preventDefault(); fn(); });
  el.addEventListener("touchstart", (e) => { e.preventDefault(); fn(); }, { passive: false });
}

// ===== Bind + Init =====
function bindUI(){
  bindTap(ui.btnStart, startShift);
  bindTap(ui.btnEnd, endShift);

  ui.citySelect.addEventListener("change", () => {
    state.cityId = ui.citySelect.value;
    rebuildUnits();
  });

  ui.agencySelect.addEventListener("change", () => {
    state.agency = ui.agencySelect.value;
    rebuildUnits();
  });

  bindTap(ui.btnAnswer, answerNext);
  bindTap(ui.btnHold, holdCall);
  bindTap(ui.btnDispatch, dispatchSelected);
  bindTap(ui.btnDismiss, dismissCall);
}

function init(){
  logLine("Inicializando...");

  if(!verifyDataLoaded()){
    ui.callText.textContent = "ERRO: arquivos data/cities.js ou data/calls.js não carregaram. Veja o REGISTRO.";
    return;
  }

  populateCities();

  state.cityId = ui.citySelect.value;
  state.agency = ui.agencySelect.value;
  state.difficulty = ui.difficultySelect.value;

  rebuildUnits();
  renderQueue();
  updateHUD();
  updateSummary();

  ui.dispatchUnitSelect.disabled = true;

  refreshButtons();

  logLine("✅ Sistema pronto. Selecione cidade/agência e clique em INICIAR TURNO.");
}

bindUI();
init();