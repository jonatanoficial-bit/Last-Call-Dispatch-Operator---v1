// script.js
// Last Call Dispatch Operator - FASE A: Fila + Atendimento com Perguntas + Despacho Manual
// Regras:
// - Você só pode despachar após coletar informações mínimas (endereço/situação/risco)
// - Perguntas consomem tempo e afetam a assertividade
// - Trote existe: o correto é encerrar, e perguntas ajudam a confirmar

const $ = (id) => document.getElementById(id);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

// ===== Typewriter =====
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
async function typeAppend(el, text, speedMs){
  const token = ++typingToken;
  // não limpa, apenas adiciona
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

// ===== UI refs (IDs existentes do seu layout) =====
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

// Vamos criar o painel de perguntas dinamicamente (sem mexer no index.html)
let questionsPanel = null;

function ensureQuestionsPanel(){
  if(questionsPanel) return questionsPanel;

  questionsPanel = document.createElement("div");
  questionsPanel.id = "questionsPanel";
  questionsPanel.style.marginTop = "10px";
  questionsPanel.style.display = "grid";
  questionsPanel.style.gridTemplateColumns = "1fr";
  questionsPanel.style.gap = "8px";

  const label = document.createElement("div");
  label.textContent = "Perguntas (Protocolo)";
  label.style.opacity = "0.9";
  label.style.fontWeight = "700";
  label.style.fontSize = "14px";

  const btnRow = document.createElement("div");
  btnRow.id = "questionsButtons";
  btnRow.style.display = "grid";
  btnRow.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  btnRow.style.gap = "8px";

  const status = document.createElement("div");
  status.id = "questionsStatus";
  status.style.opacity = "0.85";
  status.style.fontSize = "13px";

  questionsPanel.appendChild(label);
  questionsPanel.appendChild(btnRow);
  questionsPanel.appendChild(status);

  // coloca logo abaixo do texto da chamada
  const parent = ui.callText?.parentElement;
  if(parent){
    parent.appendChild(questionsPanel);
  } else {
    document.body.appendChild(questionsPanel);
  }

  return questionsPanel;
}

function setQuestionsStatus(text){
  const el = $("questionsStatus");
  if(el) el.textContent = text;
}

// ===== helpers =====
function severityClass(sev){
  if(sev === "leve") return "leve";
  if(sev === "medio") return "medio";
  if(sev === "grave") return "grave";
  return "trote";
}

function difficultyParams(diff){
  if(diff === "easy"){
    return { spawnBase: 18, callTTL: 40, typeSpeed: 18, scoreMult: 0.9, questionCost: 1 };
  }
  if(diff === "hard"){
    return { spawnBase: 10, callTTL: 22, typeSpeed: 10, scoreMult: 1.2, questionCost: 3 };
  }
  return { spawnBase: 14, callTTL: 30, typeSpeed: 14, scoreMult: 1.0, questionCost: 2 };
}

// ===== Game State =====
const state = {
  running: false,
  cityId: null,
  agency: "police",
  difficulty: "normal",

  shiftSeconds: 0,
  shiftDuration: 240,
  spawnTimer: 0,

  queue: [],
  current: null,        // objeto call (do CALLS)
  currentTTL: 0,

  // Estado de atendimento da chamada (o que o jogador coletou)
  callIntel: null,      // { requiredDone:Set, optionalDone:Set, collected:{address,situation,danger}, notes:[] }

  score: 0,
  stats: { handled:0, correct:0, wrong:0, pranks:0, expired:0 },

  units: []
};

function refreshButtons(){
  const canAnswer = state.running && !state.current && state.queue.length > 0;
  const hasCurrent = state.running && !!state.current;

  ui.btnAnswer.disabled = !canAnswer;
  ui.btnHold.disabled = !hasCurrent;

  // despacho só libera se tiver chamada e requisitos mínimos coletados
  const canDispatch = hasCurrent && isDispatchUnlocked();

  ui.dispatchUnitSelect.disabled = !canDispatch;
  ui.btnDispatch.disabled = !canDispatch;
  ui.btnDismiss.disabled = !hasCurrent; // encerrar pode sempre (mas pode penalizar)

  ui.pillStatus.textContent = state.running ? "Turno em andamento" : "Turno parado";

  if(!state.current){
    ui.pillCallTimer.textContent = "Sem chamada";
  }
}

function isDispatchUnlocked(){
  if(!state.current || !state.callIntel) return false;

  const req = state.current.questions?.required || ["address","situation","danger"];
  const done = state.callIntel.requiredDone;

  // trote pode não exigir "danger"
  if(state.current.truth?.isPrank){
    // se for trote, exigimos pelo menos address + situation (ou o que vier no required)
    return req.every(k => done.has(k));
  }

  // caso real: exige tudo do required
  return req.every(k => done.has(k));
}

// ===== Cities / Units =====
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

  // pesos variando ao longo do turno
  const weights = {
    trote: clamp(0.28 - progress*0.12, 0.10, 0.28),
    leve:  clamp(0.34 - progress*0.10, 0.14, 0.34),
    medio: clamp(0.26 + progress*0.06, 0.20, 0.36),
    grave: clamp(0.12 + progress*0.16, 0.14, 0.45),
  };

  const scored = window.CALLS.map(call => ({ call, w: weights[call.severity] ?? 0.2 }));
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
  refreshButtons();
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

  // inicia inteligência da chamada
  state.callIntel = {
    requiredDone: new Set(),
    optionalDone: new Set(),
    collected: { address: null, situation: null, danger: null },
    notes: []
  };

  updateCurrentUI(true);
  renderQueue();
  refreshButtons();
  renderQuestions();
}

function greetingFor(call){
  const city = getCity();
  if(state.agency === "police"){
    return city.greetingPolice || "190, qual sua emergência?";
  }
  return city.greetingFire || "193, Bombeiros, qual sua emergência?";
}

function updateCurrentUI(isNew){
  ensureQuestionsPanel();

  if(!state.current){
    ui.callMeta.textContent = "—";
    ui.dispatchInfo.textContent = "—";
    ui.callText.textContent = "Aguardando chamadas...";
    ui.dispatchUnitSelect.value = "";
    setQuestionsStatus("Nenhuma chamada ativa.");
    clearQuestionButtons();
    refreshButtons();
    return;
  }

  const params = difficultyParams(state.difficulty);
  const greet = greetingFor(state.current);
  const sev = state.current.severity;

  ui.callMeta.textContent = `Linha: ${greet} • Caso: ${state.current.title} • Gravidade (inicial): ${sev.toUpperCase()}`;

  if(isNew){
    const initial = `${greet}\n\nChamador: ${state.current.text}\n`;
    typeWriter(ui.callText, initial, params.typeSpeed);
  }

  // aviso de despacho bloqueado
  ui.dispatchInfo.textContent = isDispatchUnlocked()
    ? `Despacho liberado. Selecione a unidade adequada para "${state.current.title}".`
    : `Despacho BLOQUEADO: pergunte endereço + situação + risco antes de despachar.`;

  updateQuestionsStatusLine();
  refreshButtons();
}

function updateQuestionsStatusLine(){
  if(!state.current || !state.callIntel){
    setQuestionsStatus("—");
    return;
  }

  const req = state.current.questions?.required || ["address","situation","danger"];
  const done = state.callIntel.requiredDone;

  const checklist = req.map(k => `${done.has(k) ? "✅" : "⬜"} ${k}`).join("  |  ");
  setQuestionsStatus(`Protocolo: ${checklist}`);
}

// ===== Perguntas UI =====
function clearQuestionButtons(){
  const row = $("questionsButtons");
  if(row) row.innerHTML = "";
}

function makeButton(text, onTap, disabled=false){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn"; // usa a classe do seu CSS (se existir). Se não, funciona igual.
  b.textContent = text;
  b.disabled = !!disabled;

  // mobile robust
  b.addEventListener("click", (e) => { e.preventDefault(); onTap(); });
  b.addEventListener("touchstart", (e) => { e.preventDefault(); onTap(); }, { passive:false });

  // estilo mínimo (se o CSS não cobrir)
  b.style.padding = "10px 12px";
  b.style.borderRadius = "10px";
  b.style.border = "1px solid rgba(255,255,255,0.12)";
  b.style.background = "rgba(255,255,255,0.06)";
  b.style.color = "inherit";
  b.style.cursor = "pointer";
  b.style.fontWeight = "700";
  b.style.fontSize = "13px";

  return b;
}

function renderQuestions(){
  ensureQuestionsPanel();
  clearQuestionButtons();

  if(!state.current) return;

  const row = $("questionsButtons");
  const call = state.current;
  const intel = state.callIntel;
  const params = difficultyParams(state.difficulty);

  const qDef = call.questions || {};
  const req = qDef.required || ["address","situation","danger"];

  function canAsk(k){
    // só permite perguntar uma vez cada required
    if(req.includes(k) && intel.requiredDone.has(k)) return false;
    return true;
  }

  async function askKey(k){
    if(!state.current) return;
    if(!canAsk(k)) return;

    // custo de tempo por pergunta
    state.currentTTL = Math.max(0, state.currentTTL - params.questionCost);
    ui.pillCallTimer.textContent = `Tempo da chamada: ${formatTime(state.currentTTL)}`;

    // texto pergunta + resposta com typewriter
    const qText = (qDef[k] && qDef[k].q) ? qDef[k].q : `Perguntar: ${k}?`;
    const aText = (qDef[k] && qDef[k].a) ? qDef[k].a : "(sem resposta definida)";

    await typeAppend(ui.callText, `\n\nOperador: ${qText}\n`, params.typeSpeed);
    await typeAppend(ui.callText, `Chamador: ${aText}\n`, params.typeSpeed);

    // marca como feito (required)
    if(req.includes(k)){
      intel.requiredDone.add(k);
      intel.collected[k] = aText;
    }

    // atualiza UI de liberação
    ui.dispatchInfo.textContent = isDispatchUnlocked()
      ? `Despacho liberado. Selecione a unidade adequada para "${call.title}".`
      : `Despacho BLOQUEADO: pergunte endereço + situação + risco antes de despachar.`;

    updateQuestionsStatusLine();
    refreshButtons();
  }

  // required buttons
  const requiredButtons = [
    { key: "address", label: "📍 Endereço" },
    { key: "situation", label: "❓ Situação" },
    { key: "danger", label: "⚠️ Risco/Feridos" }
  ];

  requiredButtons.forEach(rb => {
    if(req.includes(rb.key)){
      row.appendChild(makeButton(rb.label, () => askKey(rb.key), !canAsk(rb.key)));
    }
  });

  // optional
  const optional = Array.isArray(qDef.optional) ? qDef.optional : [];
  optional.forEach(opt => {
    const already = intel.optionalDone.has(opt.id);
    row.appendChild(makeButton(`➕ ${opt.id}`, async () => {
      if(!state.current || already) return;

      state.currentTTL = Math.max(0, state.currentTTL - Math.max(1, Math.floor(params.questionCost/2)));
      ui.pillCallTimer.textContent = `Tempo da chamada: ${formatTime(state.currentTTL)}`;

      const qText = opt.q || "Perguntar mais detalhes";
      const aText = opt.a || "(sem resposta)";

      await typeAppend(ui.callText, `\n\nOperador: ${qText}\n`, params.typeSpeed);
      await typeAppend(ui.callText, `Chamador: ${aText}\n`, params.typeSpeed);

      intel.optionalDone.add(opt.id);
      intel.notes.push(opt.id);

      updateQuestionsStatusLine();
      refreshButtons();
    }, already));
  });

  updateQuestionsStatusLine();
}

// ===== Score / Resolve =====
function addScore(delta){
  state.score += delta;
  ui.hudScore.textContent = String(state.score);
}

// Avalia desempenho considerando: despacho correto + qualidade do atendimento (quantidade de perguntas feitas)
function resolveCall(unitId, action){
  if(!state.current) return;

  const params = difficultyParams(state.difficulty);
  const mult = params.scoreMult;

  const call = state.current;
  const truth = call.truth || {};
  const isPrank = !!truth.isPrank;

  // “qualidade de atendimento”: required + optional
  const req = call.questions?.required || ["address","situation","danger"];
  const requiredDoneCount = state.callIntel ? state.callIntel.requiredDone.size : 0;
  const optionalDoneCount = state.callIntel ? state.callIntel.optionalDone.size : 0;

  // bônus por investigar (até um limite)
  const intelBonus = clamp(requiredDoneCount*0.08 + optionalDoneCount*0.04, 0, 0.25);

  // recomendado “verdadeiro” (o que realmente era necessário)
  const city = getCity();
  const cityUnits = new Set((city.units[state.agency] || []).map(u => u.id));
  const recommendedTrue = (call.recommended?.[state.agency] || []).filter(id => cityUnits.has(id));

  let delta = 0;
  let result = "";

  if(action === "dismiss"){
    if(isPrank){
      delta = Math.floor((20 + 20*intelBonus) * mult);
      state.stats.pranks++;
      state.stats.correct++;
      result = `✅ Trote encerrado corretamente. +${delta} pts`;
    } else {
      delta = -Math.floor((35 + 20*(1-intelBonus)) * mult);
      state.stats.wrong++;
      result = `❌ Encerrado sem despacho em caso REAL. ${delta} pts`;
    }
  } else {
    if(isPrank){
      delta = -Math.floor((30 + 10*(1-intelBonus)) * mult);
      state.stats.wrong++;
      state.stats.pranks++;
      result = `⚠️ Era trote. Recursos desperdiçados. ${delta} pts`;
    } else {
      const ok = recommendedTrue.includes(unitId) || (recommendedTrue.length === 0 && !!unitId);

      if(ok){
        const base = (call.severity === "leve") ? 18 : (call.severity === "medio" ? 28 : 45);
        delta = Math.floor((base + base*intelBonus) * mult);
        state.stats.correct++;
        result = `✅ Unidade correta. +${delta} pts`;
      } else {
        const base = (call.severity === "leve") ? 18 : (call.severity === "medio" ? 28 : 55);
        delta = -Math.floor((base + base*(1-intelBonus)*0.35) * mult);
        state.stats.wrong++;
        result = `❌ Unidade errada. ${delta} pts`;
      }
    }
  }

  state.stats.handled++;
  addScore(delta);
  logLine(`${result} (Caso: ${call.title})`);

  // limpa chamada
  state.current = null;
  state.currentTTL = 0;
  state.callIntel = null;

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
      state.callIntel = null;
      updateCurrentUI(false);
      renderQueue();
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

// ===== Actions =====
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
  state.callIntel = null;
  state.score = 0;
  state.stats = { handled:0, correct:0, wrong:0, pranks:0, expired:0 };

  ui.btnStart.disabled = true;
  ui.btnEnd.disabled = false;
  ui.citySelect.disabled = true;
  ui.agencySelect.disabled = true;
  ui.difficultySelect.disabled = true;

  ensureQuestionsPanel();
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

  const params = difficultyParams(state.difficulty);

  const call = state.current;
  const ttlBack = Math.max(10, state.currentTTL - (params.questionCost + 3));
  state.queue.unshift({ call, createdAt: state.shiftSeconds, ttl: ttlBack });

  logLine(`⏸ Chamada em espera: "${call.title}" (tempo reduzido)`);
  state.current = null;
  state.currentTTL = 0;
  state.callIntel = null;

  updateCurrentUI(false);
  renderQueue();
  refreshButtons();
}

function dispatchSelected(){
  if(!state.running) return;
  if(!state.current) return;

  if(!isDispatchUnlocked()){
    alert("Despacho bloqueado: pergunte endereço + situação + risco antes.");
    return;
  }

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

  // se for caso real e você não coletou nada, penaliza — mas permitido
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

  ensureQuestionsPanel();
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