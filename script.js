/* =========================================================
   Last Call Dispatch Operator - Fase 2B (DINÂMICAS)
   - Perguntas dinâmicas por caso (CALLS.protocol.questions)
   - Despacho só libera após perguntas obrigatórias (required)
   - Severidade evolui (baseSeverity + efeitos das perguntas)
   - Fila pausa enquanto há chamada ativa (mobile-friendly)
   - Chamada ativa não some: se atrasar => penaliza, mas continua
   ========================================================= */

(function () {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtTime = (sec) => `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;

  function nowStamp() {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  }

  function safeRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Typewriter
  function typewriter(el, text, speed = 10) {
    if (!el) return;
    const token = Symbol("tw");
    el.__twToken = token;
    el.textContent = "";
    let i = 0;
    function tick() {
      if (el.__twToken !== token) return;
      if (i >= text.length) return;
      el.textContent += text[i++];
      setTimeout(tick, speed);
    }
    tick();
  }

  // Escape
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ----------------------------
  // DOM
  // ----------------------------
  const el = {
    hudShift: $("hudShift"),
    hudTime: $("hudTime"),
    hudScore: $("hudScore"),
    hudQueue: $("hudQueue"),

    citySelect: $("citySelect"),
    agencySelect: $("agencySelect"),
    difficultySelect: $("difficultySelect"),

    btnStartShift: $("btnStartShift"),
    btnEndShift: $("btnEndShift"),

    unitsList: $("unitsList"),
    log: $("log"),

    pillStatus: $("pillStatus"),
    pillCallTimer: $("pillCallTimer"),

    callMeta: $("callMeta"),
    callText: $("callText"),

    btnAnswer: $("btnAnswer"),
    btnHold: $("btnHold"),

    dispatchInfo: $("dispatchInfo"),
    dispatchUnitSelect: $("dispatchUnitSelect"),
    btnDispatch: $("btnDispatch"),
    btnDismiss: $("btnDismiss"),

    queueList: $("queueList"),
    shiftSummary: $("shiftSummary"),
  };

  // Cria UI dinâmica de perguntas dentro da área de Operação
  function ensureDynamicQuestionsUI() {
    let panel = document.getElementById("dynamicQuestionsPanel");
    if (panel) return panel;

    // tenta colocar dentro do card "Operação"
    // Achando o card que contém "Operação" pelo botão de despacho ou callText
    const operationCard = el.callText ? el.callText.closest(".card") : null;
    if (!operationCard) return null;

    panel = document.createElement("div");
    panel.id = "dynamicQuestionsPanel";
    panel.className = "subCard";
    panel.innerHTML = `
      <div class="subTitle">Perguntas (Protocolo Realista)</div>
      <div class="meta" id="dqMeta">Nenhuma chamada ativa</div>
      <div id="dqButtons" class="btnRow" style="margin-top:8px;"></div>
      <div class="hint" id="dqHint" style="margin-top:10px;">
        Dica: Faça as perguntas obrigatórias para liberar o despacho. Em casos graves, priorize endereço e risco.
      </div>
    `;

    // Inserir após a subCard da chamada (a primeira subCard dentro do card Operação)
    const subCards = operationCard.querySelectorAll(".subCard");
    if (subCards && subCards.length) {
      subCards[0].insertAdjacentElement("afterend", panel);
    } else {
      operationCard.appendChild(panel);
    }
    return panel;
  }

  const dq = {
    panel: null,
    meta: null,
    buttons: null,
    hint: null,
  };

  function bindDynamicUI() {
    dq.panel = ensureDynamicQuestionsUI();
    if (!dq.panel) return;
    dq.meta = document.getElementById("dqMeta");
    dq.buttons = document.getElementById("dqButtons");
    dq.hint = document.getElementById("dqHint");
  }

  // ----------------------------
  // Dados (fallback)
  // ----------------------------
  const FALLBACK_CITIES = [
    { id: "sp_sim", name: "São Paulo (Simulação)", country: "BR" },
    { id: "ny_sim", name: "New York (Simulação)", country: "US" },
    { id: "ldn_sim", name: "London (Simulação)", country: "EU" },
  ];

  function getCities() {
    const C = window.CITIES;
    if (Array.isArray(C) && C.length) return C;
    return FALLBACK_CITIES;
  }

  function getCalls() {
    const C = window.CALLS;
    if (Array.isArray(C) && C.length) return C;
    return [];
  }

  // ----------------------------
  // Estado
  // ----------------------------
  const state = {
    shiftActive: false,
    pauseQueueWhileActiveCall: true, // regra do modo B (mobile)
    difficulty: "normal",
    agency: "police",
    cityId: null,

    score: 0,
    timeSec: 0,

    queue: [],
    activeCall: null,
    units: [],

    stats: {
      handled: 0,
      dispatched: 0,
      correct: 0,
      wrong: 0,
      expired: 0,
      dismissedTrote: 0,
      overtime: 0,
    },

    tickInterval: null,
    spawnAccumulator: 0,
    maxQueue: 5,
  };

  let uidCounter = 0;

  // callInstance:
  // {
  //   uid, def,
  //   severity, confidenceTrote,
  //   queueTTL, callTTL,
  //   overdue, overduePenalized,
  //   asked: { [questionId]: true },
  //   dispatchUnlocked
  // }
  function makeCallInstance(def) {
    uidCounter += 1;

    const baseSev = (def.baseSeverity || "leve").toLowerCase();
    const inst = {
      uid: `call_${uidCounter}_${Date.now()}`,
      def,
      severity: baseSev,
      confidenceTrote: baseSev === "trote" ? 2 : 0,

      queueTTL: queueTTLBySeverity(baseSev, state.difficulty),
      callTTL: callTTLBySeverity(baseSev, state.difficulty),

      overdue: false,
      overduePenalized: false,

      asked: {},
      dispatchUnlocked: false,
    };
    return inst;
  }

  // ----------------------------
  // Log
  // ----------------------------
  function log(msg) {
    if (!el.log) return;
    el.log.textContent = `${nowStamp()} ${msg}\n` + el.log.textContent;
  }

  // ----------------------------
  // Severidade / Score
  // ----------------------------
  function humanSeverity(sev) {
    const s = String(sev || "leve").toLowerCase();
    if (s === "grave") return "GRAVE";
    if (s === "medio") return "MÉDIO";
    if (s === "trote") return "TROTE";
    return "LEVE";
  }

  function severityScore(sev) {
    const s = String(sev || "leve").toLowerCase();
    if (s === "grave") return 20;
    if (s === "medio") return 14;
    if (s === "trote") return 0;
    return 10;
  }

  function severityBadge(sev) {
    const s = String(sev || "leve").toLowerCase();
    if (s === "grave") return `<span class="pill" style="border-color:rgba(255,70,110,0.35); box-shadow:0 0 0 1px rgba(255,70,110,0.12)">GRAVE</span>`;
    if (s === "medio") return `<span class="pill" style="border-color:rgba(255,190,70,0.35); box-shadow:0 0 0 1px rgba(255,190,70,0.12)">MÉDIO</span>`;
    if (s === "trote") return `<span class="pill" style="border-color:rgba(160,160,160,0.25); box-shadow:0 0 0 1px rgba(160,160,160,0.10)">TROTE</span>`;
    return `<span class="pill" style="border-color:rgba(60,220,160,0.25); box-shadow:0 0 0 1px rgba(60,220,160,0.10)">LEVE</span>`;
  }

  // ----------------------------
  // Timers (fila e chamada ativa)
  // ----------------------------
  function spawnIntervalByDifficulty(diff) {
    if (diff === "easy") return 10;
    if (diff === "hard") return 5;
    return 7;
  }

  function queueTTLBySeverity(sev, diff) {
    const s = String(sev || "leve").toLowerCase();
    let base = 30;
    if (s === "leve") base = 35;
    if (s === "medio") base = 30;
    if (s === "grave") base = 25;
    if (s === "trote") base = 20;

    if (diff === "easy") base += 10;
    if (diff === "hard") base -= 5;

    return clamp(base, 10, 90);
  }

  function callTTLBySeverity(sev, diff) {
    const s = String(sev || "leve").toLowerCase();
    let base = 60;
    if (s === "leve") base = 55;
    if (s === "medio") base = 60;
    if (s === "grave") base = 75;
    if (s === "trote") base = 40;

    if (diff === "easy") base += 15;
    if (diff === "hard") base -= 10;

    return clamp(base, 25, 180);
  }

  // ----------------------------
  // Linha / Abertura
  // ----------------------------
  function lineByRegion(region, agency) {
    const r = (region || "BR").toUpperCase();
    if (r === "BR") return agency === "fire" ? "193" : "190";
    if (r === "US") return "911";
    if (r === "EU") return "112";
    if (r === "OC") return "000";
    if (r === "AS") return agency === "fire" ? "119" : "110";
    if (r === "AF") return agency === "fire" ? "10177/112" : "10111/112";
    return "Emergência";
  }

  function defaultOpener(region, agency) {
    const r = (region || "BR").toUpperCase();
    if (r === "BR") return agency === "fire" ? "193, Bombeiros. Qual sua emergência?" : "190, Polícia Militar. Qual sua emergência?";
    if (r === "US") return "911, what's your emergency?";
    if (r === "EU") return "112, emergência. Qual a sua localização e situação?";
    if (r === "OC") return "000, do you need Police, Fire or Ambulance?";
    if (r === "AS") return agency === "fire" ? "119, Fire/Rescue. What's the emergency?" : "110, Police. What's your emergency?";
    return "Central de emergência. Qual a sua ocorrência?";
  }

  // ----------------------------
  // Unidades (roles)
  // ----------------------------
  function getUnitsFor(cityId, agency) {
    if (agency === "police") {
      if (String(cityId).includes("sp")) {
        return [
          { id: "u_area_1", name: "PM Área (VTR)", role: "area_patrol", status: "available" },
          { id: "u_rota_1", name: "ROTA", role: "tactical_rota", status: "available" },
          { id: "u_choque_1", name: "Choque", role: "shock_riot", status: "available" },
          { id: "u_gate_1", name: "GATE (Antibomba)", role: "bomb_gate", status: "available" },
          { id: "u_aaguia_1", name: "Águia (Helicóptero)", role: "air_eagle", status: "available" },
          { id: "u_pc_1", name: "Polícia Civil (Investigação)", role: "civil_investigation", status: "available" },
        ];
      }
      if (String(cityId).includes("ny")) {
        return [
          { id: "u_patrol_1", name: "Area Patrol", role: "area_patrol", status: "available" },
          { id: "u_swat_1", name: "SWAT", role: "tactical_rota", status: "available" },
          { id: "u_federal_1", name: "Federal Unit", role: "civil_investigation", status: "available" },
          { id: "u_bomb_1", name: "Bomb Squad", role: "bomb_gate", status: "available" },
          { id: "u_air_1", name: "Air Support", role: "air_eagle", status: "available" },
        ];
      }
      return [
        { id: "u_patrol_1", name: "Polícia de Área", role: "area_patrol", status: "available" },
        { id: "u_tac_1", name: "Unidade Tática", role: "tactical_rota", status: "available" },
        { id: "u_invest_1", name: "Investigação", role: "civil_investigation", status: "available" },
      ];
    } else {
      if (String(cityId).includes("sp")) {
        return [
          { id: "f_engine_1", name: "Auto Bomba (AB)", role: "fire_engine", status: "available" },
          { id: "f_rescue_1", name: "Resgate (UR)", role: "fire_rescue", status: "available" },
          { id: "f_medic_1", name: "Ambulância (USA)", role: "medic_ambulance", status: "available" },
          { id: "f_haz_1", name: "HazMat", role: "hazmat", status: "available" },
          { id: "f_ladder_1", name: "Auto Escada", role: "ladder_truck", status: "available" },
        ];
      }
      return [
        { id: "f_engine_1", name: "Fire Engine", role: "fire_engine", status: "available" },
        { id: "f_rescue_1", name: "Rescue", role: "fire_rescue", status: "available" },
        { id: "f_medic_1", name: "Ambulance", role: "medic_ambulance", status: "available" },
      ];
    }
  }

  function renderUnits() {
    state.units = getUnitsFor(state.cityId, state.agency);

    if (el.unitsList) {
      el.unitsList.innerHTML = state.units
        .map(
          (u) => `
        <div class="subCard" style="padding:10px; margin-top:0;">
          <div style="font-weight:900;">${escapeHtml(u.name)}</div>
          <div style="font-size:12px; color:rgba(233,240,255,0.65)">role: ${escapeHtml(u.role)}</div>
          <div style="font-size:12px; color:rgba(233,240,255,0.65)">Status: ${u.status === "available" ? "Disponível" : escapeHtml(u.status)}</div>
        </div>`
        )
        .join("");
    }

    if (el.dispatchUnitSelect) {
      el.dispatchUnitSelect.innerHTML =
        `<option value="">Selecione a unidade</option>` +
        state.units
          .filter((u) => u.status === "available")
          .map((u) => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.role)})</option>`)
          .join("");
    }
  }

  // ----------------------------
  // Cidades
  // ----------------------------
  function cityNameById(id) {
    const cities = getCities();
    const c = cities.find((x) => x.id === id);
    return c ? c.name : String(id || "—");
  }

  function flagByCityId(id) {
    const cities = getCities();
    const c = cities.find((x) => x.id === id);
    if (!c) return "🏙️";
    const cc = (c.country || "").toUpperCase();
    if (cc === "BR") return "🇧🇷";
    if (cc === "US") return "🇺🇸";
    if (cc === "EU") return "🇪🇺";
    if (cc === "JP") return "🇯🇵";
    if (cc === "IN") return "🇮🇳";
    if (cc === "AU") return "🇦🇺";
    if (cc === "ZA") return "🇿🇦";
    return "🏙️";
  }

  function populateCities() {
    const cities = getCities();
    if (!el.citySelect) return;
    el.citySelect.innerHTML = cities
      .map((c) => `<option value="${escapeHtml(c.id)}">${flagByCityId(c.id)} ${escapeHtml(c.name)}</option>`)
      .join("");
    state.cityId = cities[0]?.id || "sp_sim";
    el.citySelect.value = state.cityId;
  }

  // ----------------------------
  // UI: HUD / Pills / Queue / Summary
  // ----------------------------
  function updateHud() {
    if (el.hudShift) el.hudShift.textContent = state.shiftActive ? "ATIVO" : "—";
    if (el.hudTime) el.hudTime.textContent = fmtTime(state.timeSec);
    if (el.hudScore) el.hudScore.textContent = String(state.score);
    if (el.hudQueue) el.hudQueue.textContent = String(state.queue.length);
  }

  function updatePills() {
    if (el.pillStatus) el.pillStatus.textContent = state.shiftActive ? "Turno em andamento" : "Turno parado";

    if (!el.pillCallTimer) return;
    if (!state.activeCall) {
      el.pillCallTimer.textContent = "Sem chamada";
      return;
    }
    const sec = state.activeCall.callTTL;
    const overdue = state.activeCall.overdue;
    el.pillCallTimer.textContent = overdue ? `Tempo excedido` : `Tempo da chamada: ${fmtTime(sec)}`;
  }

  function setButtons() {
    const hasShift = state.shiftActive;
    const hasQueue = state.queue.length > 0;
    const hasActive = !!state.activeCall;

    if (el.btnAnswer) el.btnAnswer.disabled = !(hasShift && !hasActive && hasQueue);
    if (el.btnHold) el.btnHold.disabled = !(hasShift && hasActive);

    const canDispatch = hasShift && hasActive && state.activeCall.dispatchUnlocked;
    if (el.dispatchUnitSelect) el.dispatchUnitSelect.disabled = !canDispatch;
    if (el.btnDispatch) el.btnDispatch.disabled = !canDispatch;
    if (el.btnDismiss) el.btnDismiss.disabled = !(hasShift && hasActive);
  }

  function renderQueue() {
    if (!el.queueList) return;
    if (!state.queue.length) {
      el.queueList.innerHTML = "—";
      return;
    }

    el.queueList.innerHTML = state.queue
      .map((c, idx) => {
        const ttl = fmtTime(c.queueTTL);
        return `
        <div class="subCard" style="padding:10px; margin-top:0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="min-width:0;">
            <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${idx + 1}. ${escapeHtml(c.def.title)}
            </div>
            <div style="font-size:12px; color:rgba(233,240,255,0.65)">
              Restante: ${ttl} • Gravidade (atual): ${escapeHtml(humanSeverity(c.severity))}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${severityBadge(c.severity)}
          </div>
        </div>`;
      })
      .join("");
  }

  function renderSummary() {
    if (!el.shiftSummary) return;

    if (!state.shiftActive) {
      el.shiftSummary.textContent = "Nenhum turno ativo.";
      return;
    }

    const s = state.stats;
    el.shiftSummary.innerHTML = `
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div class="pill">Atendidas: ${s.handled}</div>
        <div class="pill">Despachadas: ${s.dispatched}</div>
        <div class="pill">Acertos: ${s.correct}</div>
        <div class="pill">Erros: ${s.wrong}</div>
        <div class="pill">Expiradas (fila): ${s.expired}</div>
        <div class="pill">Trote encerrado: ${s.dismissedTrote}</div>
        <div class="pill">Atrasos: ${s.overtime}</div>
      </div>
      <div style="margin-top:10px; font-size:12px; color:rgba(233,240,255,0.70)">
        (Modo B) Enquanto você atende uma chamada, a fila pausa — a chamada não some antes do despacho.
      </div>
    `;
  }

  // ----------------------------
  // Perguntas dinâmicas
  // ----------------------------
  function getProtocolDef(callDef) {
    return callDef && callDef.protocol ? callDef.protocol : { required: [], questions: [] };
  }

  function updateDispatchUnlock() {
    if (!state.activeCall) return;

    const protocol = getProtocolDef(state.activeCall.def);
    const required = Array.isArray(protocol.required) ? protocol.required : [];

    // "dismiss_only" em trote: despacho deve ser evitado, mas desbloqueio existe para encerrar
    const ok = required.every((qid) => !!state.activeCall.asked[qid]);
    state.activeCall.dispatchUnlocked = ok;
  }

  function applyQuestionEffect(effect) {
    if (!state.activeCall || !effect) return;

    if (typeof effect.confidenceTrote === "number") {
      state.activeCall.confidenceTrote += effect.confidenceTrote;
      state.activeCall.confidenceTrote = clamp(state.activeCall.confidenceTrote, 0, 10);
    }

    if (effect.severity) {
      // só sobe ou ajusta conforme regra simples:
      // trote < leve < medio < grave
      const rank = { trote: 0, leve: 1, medio: 2, grave: 3 };
      const cur = state.activeCall.severity || "leve";
      const next = String(effect.severity).toLowerCase();
      if (rank[next] >= rank[cur]) state.activeCall.severity = next;
    }
  }

  function askQuestion(questionId) {
    if (!state.shiftActive || !state.activeCall) return;

    const protocol = getProtocolDef(state.activeCall.def);
    const q = (protocol.questions || []).find((x) => x.id === questionId);
    if (!q) return;

    if (state.activeCall.asked[questionId]) {
      log(`ℹ️ Pergunta já feita: ${q.label}`);
      return;
    }

    state.activeCall.asked[questionId] = true;

    // recompensa leve por coletar dados (educativo)
    state.score += 1;

    // aplica efeito na severidade/trote confidence etc
    if (q.effect) applyQuestionEffect(q.effect);

    log(`🧾 Perguntou: ${q.label} (+1)`);
    updateDispatchUnlock();
    renderActiveCall();
    renderDynamicQuestions();
    updateHud();
    setButtons();
  }

  function renderDynamicQuestions() {
    if (!dq.panel || !dq.meta || !dq.buttons || !dq.hint) return;

    if (!state.activeCall) {
      dq.meta.textContent = "Nenhuma chamada ativa";
      dq.buttons.innerHTML = "";
      dq.hint.textContent = "Dica: Faça as perguntas obrigatórias para liberar o despacho.";
      return;
    }

    const protocol = getProtocolDef(state.activeCall.def);
    const required = Array.isArray(protocol.required) ? protocol.required : [];
    const questions = Array.isArray(protocol.questions) ? protocol.questions : [];

    const checklist = required.map((qid) => (state.activeCall.asked[qid] ? `✅ ${qid}` : `⬜ ${qid}`)).join(" | ");
    dq.meta.textContent = `Obrigatórias: ${checklist || "nenhuma"} • Gravidade atual: ${humanSeverity(state.activeCall.severity)}`;

    dq.buttons.innerHTML = questions
      .map((q) => {
        const asked = !!state.activeCall.asked[q.id];
        const cls = asked ? "btnGhost" : "btnPrimary";
        const disabled = asked ? "disabled" : "";
        return `<button class="${cls}" data-qid="${escapeHtml(q.id)}" ${disabled}>${escapeHtml(q.label)}</button>`;
      })
      .join("");

    dq.hint.textContent = state.activeCall.def.hint || "Colete dados, libere despacho e envie a unidade correta.";

    // bind clicks
    const btns = dq.buttons.querySelectorAll("button[data-qid]");
    btns.forEach((b) => {
      b.addEventListener("click", () => {
        const qid = b.getAttribute("data-qid");
        askQuestion(qid);
      });
    });
  }

  // ----------------------------
  // Render chamada ativa (transcrição)
  // ----------------------------
  function renderActiveCall() {
    if (!el.callText || !el.callMeta) return;

    if (!state.activeCall) {
      el.callMeta.textContent = "—";
      el.callText.textContent = state.shiftActive ? "Aguardando chamadas..." : "Inicie um turno para receber chamadas.";
      if (el.dispatchInfo) el.dispatchInfo.textContent = "—";
      renderDynamicQuestions();
      return;
    }

    const c = state.activeCall;
    const def = c.def;

    const line = lineByRegion(def.region, state.agency);
    el.callMeta.textContent =
      `Linha: ${line} • Caso: ${def.title} • Gravidade atual: ${humanSeverity(c.severity)}`;

    const opener = defaultOpener(def.region, state.agency);
    const protocol = getProtocolDef(def);

    // cria transcrição com o que já foi perguntado
    let convo = `${opener}\n\nChamador: ${def.title}\n\n`;

    const askedIds = Object.keys(c.asked).filter((k) => c.asked[k]);
    if (askedIds.length) {
      askedIds.forEach((qid) => {
        const q = (protocol.questions || []).find((x) => x.id === qid);
        if (!q) return;
        convo += `Operador: ${q.prompt}\n`;
        convo += `Chamador: ${q.answer || "(sem resposta)"}\n\n`;
      });
    } else {
      convo += `*(Você ainda não fez perguntas. Use o painel de protocolo.)*\n\n`;
    }

    if (def.hint) convo += `[Dica] ${def.hint}\n`;

    typewriter(el.callText, convo, 10);

    if (el.dispatchInfo) {
      el.dispatchInfo.textContent = c.dispatchUnlocked
        ? `Despacho liberado. Selecione a unidade e despache.`
        : `Despacho bloqueado. Faça as perguntas obrigatórias primeiro.`;
    }
  }

  // ----------------------------
  // Escolha de caso (variedade + chance de trote)
  // ----------------------------
  function pickCallDef() {
    const calls = getCalls();
    const poolByAgency = calls.filter((c) => (c.agency || "police") === state.agency);
    const pool = poolByAgency.length ? poolByAgency : calls;

    const troteChance = state.difficulty === "easy" ? 0.10 : state.difficulty === "hard" ? 0.18 : 0.15;
    let candidates = pool;

    if (Math.random() < troteChance) {
      const trotes = pool.filter((c) => String(c.baseSeverity).toLowerCase() === "trote");
      if (trotes.length) candidates = trotes;
    }

    return safeRandom(candidates);
  }

  function spawnCall() {
    if (!state.shiftActive) return;
    if (state.queue.length >= state.maxQueue) return;

    const def = pickCallDef();
    if (!def) return;

    const inst = makeCallInstance(def);
    state.queue.push(inst);

    log(`🚨 Nova chamada: "${def.title}" (${humanSeverity(inst.severity)})`);
  }

  // ----------------------------
  // Ações do jogador
  // ----------------------------
  function startShift() {
    if (state.shiftActive) return;

    state.cityId = el.citySelect ? (el.citySelect.value || getCities()[0]?.id || "sp_sim") : "sp_sim";
    state.agency = el.agencySelect ? (el.agencySelect.value || "police") : "police";
    state.difficulty = el.difficultySelect ? (el.difficultySelect.value || "normal") : "normal";

    state.shiftActive = true;
    state.timeSec = 0;
    state.score = 0;
    state.queue = [];
    state.activeCall = null;
    state.spawnAccumulator = 0;

    state.stats = { handled: 0, dispatched: 0, correct: 0, wrong: 0, expired: 0, dismissedTrote: 0, overtime: 0 };

    if (el.btnStartShift) el.btnStartShift.disabled = true;
    if (el.btnEndShift) el.btnEndShift.disabled = false;

    renderUnits();

    log(`✅ Turno iniciado em ${flagByCityId(state.cityId)} ${cityNameById(state.cityId)} • Agência: ${state.agency} • Dificuldade: ${state.difficulty}`);
    log(`🧠 Fase 2B ativa: perguntas DINÂMICAS por caso + severidade evolutiva.`);

    spawnCall();
    spawnCall();

    if (state.tickInterval) clearInterval(state.tickInterval);
    state.tickInterval = setInterval(tick, 1000);

    renderAll();
  }

  function endShift() {
    if (!state.shiftActive) return;

    state.shiftActive = false;

    if (state.tickInterval) {
      clearInterval(state.tickInterval);
      state.tickInterval = null;
    }

    if (el.btnStartShift) el.btnStartShift.disabled = false;
    if (el.btnEndShift) el.btnEndShift.disabled = true;

    log("🛑 Turno encerrado.");
    renderAll();
  }

  function answerNext() {
    if (!state.shiftActive) return;
    if (state.activeCall) return;
    if (!state.queue.length) return;

    state.activeCall = state.queue.shift();
    state.stats.handled += 1;

    updateDispatchUnlock();
    log(`📞 Atendeu: "${state.activeCall.def.title}" (${humanSeverity(state.activeCall.severity)})`);

    renderUnits(); // atualiza select de despacho
    renderAll();
  }

  function holdCall() {
    if (!state.shiftActive || !state.activeCall) return;

    const call = state.activeCall;
    state.activeCall = null;

    // ao voltar pra fila, diminui um pouco o TTL (pessoa pode desligar)
    call.queueTTL = clamp(call.queueTTL, 10, 25);
    state.queue.unshift(call);

    log(`⏸️ Chamada em espera e devolvida à fila.`);
    renderAll();
  }

  function dismissCall() {
    if (!state.shiftActive || !state.activeCall) return;

    const c = state.activeCall;
    const isTrote = (c.severity === "trote") || (c.confidenceTrote >= 6);

    if (isTrote) {
      state.score += 8;
      state.stats.dismissedTrote += 1;
      log(`✅ Encerrado como trote corretamente. (+8)`);
    } else {
      state.score -= 8;
      state.stats.wrong += 1;
      log(`❌ Encerrar chamada real gera penalidade. (-8)`);
    }

    state.activeCall = null;
    renderAll();
  }

  function dispatchSelectedUnit() {
    if (!state.shiftActive || !state.activeCall) return;

    if (!state.activeCall.dispatchUnlocked) {
      log("⛔ Despacho bloqueado: faça as perguntas obrigatórias.");
      return;
    }

    const unitId = el.dispatchUnitSelect ? el.dispatchUnitSelect.value : "";
    if (!unitId) {
      log("⚠️ Selecione uma unidade primeiro.");
      return;
    }

    const unit = state.units.find((u) => u.id === unitId);
    if (!unit || unit.status !== "available") {
      log("⚠️ Unidade inválida/indisponível.");
      return;
    }

    const def = state.activeCall.def;
    const severityNow = state.activeCall.severity;

    const correctRoles = (def.dispatch && Array.isArray(def.dispatch.correctRoles)) ? def.dispatch.correctRoles : ["any"];

    const isTrote = (severityNow === "trote") || (state.activeCall.confidenceTrote >= 6);
    if (isTrote) {
      state.score -= 10;
      state.stats.wrong += 1;
      log(`❌ Era trote. Você despachou e perdeu recursos. (-10)`);
      state.activeCall = null;
      renderAll();
      return;
    }

    // unidade ocupada por 5s (simulação)
    unit.status = "busy";
    setTimeout(() => {
      unit.status = "available";
      renderUnits();
    }, 5000);

    state.stats.dispatched += 1;

    // penalidade por atraso (não some, mas pune)
    if (state.activeCall.overdue && !state.activeCall.overduePenalized) {
      state.activeCall.overduePenalized = true;
      state.stats.overtime += 1;
      state.score -= 5;
      log(`⏱️ Demora crítica: penalidade por atraso. (-5)`);
    }

    const ok = correctRoles.includes(unit.role) || correctRoles.includes("any");
    if (ok) {
      const bonus = severityScore(severityNow);
      state.score += bonus;
      state.stats.correct += 1;
      log(`✅ Despacho correto: ${unit.role} (+${bonus})`);
      log(`📄 Resultado: ocorrência tratada com sucesso (simulado).`);
    } else {
      state.score -= 12;
      state.stats.wrong += 1;
      log(`❌ Despacho incorreto: ${unit.role} (-12)`);
      log(`📄 Resultado: falha operacional (simulado).`);
    }

    state.activeCall = null;
    renderAll();
  }

  // ----------------------------
  // Tick
  // ----------------------------
  function tick() {
    if (!state.shiftActive) return;

    state.timeSec += 1;

    const hasActive = !!state.activeCall;
    const pauseQueue = state.pauseQueueWhileActiveCall && hasActive;

    // fila só conta quando não há chamada ativa (modo B)
    if (!pauseQueue) {
      for (let i = state.queue.length - 1; i >= 0; i--) {
        const c = state.queue[i];
        c.queueTTL -= 1;
        if (c.queueTTL <= 0) {
          state.queue.splice(i, 1);
          state.stats.expired += 1;
          state.score -= 10;
          log(`⏳ Expirou na fila: "${c.def.title}" (-10)`);
        }
      }
    }

    // chamada ativa nunca some
    if (hasActive) {
      state.activeCall.callTTL -= 1;
      if (state.activeCall.callTTL <= 0) {
        state.activeCall.callTTL = 0;
        state.activeCall.overdue = true;
      }
      updateDispatchUnlock();
    }

    // spawn
    const interval = spawnIntervalByDifficulty(state.difficulty);
    state.spawnAccumulator += 1;
    if (state.spawnAccumulator >= interval) {
      state.spawnAccumulator = 0;
      if (state.queue.length < state.maxQueue) spawnCall();
    }

    renderAll();
  }

  // ----------------------------
  // Render Geral
  // ----------------------------
  function renderAll() {
    updateHud();
    updatePills();
    setButtons();
    renderQueue();
    renderUnits();
    renderActiveCall();
    renderDynamicQuestions();
    renderSummary();
  }

  // ----------------------------
  // Bind UI
  // ----------------------------
  function bind() {
    if (el.citySelect) {
      el.citySelect.addEventListener("change", () => {
        state.cityId = el.citySelect.value;
        log(`🏙️ Cidade: ${flagByCityId(state.cityId)} ${cityNameById(state.cityId)}`);
        renderUnits();
      });
    }

    if (el.agencySelect) {
      el.agencySelect.addEventListener("change", () => {
        state.agency = el.agencySelect.value;
        log(`🏛️ Agência: ${state.agency}`);
        renderUnits();
        renderAll();
      });
    }

    if (el.difficultySelect) {
      el.difficultySelect.addEventListener("change", () => {
        state.difficulty = el.difficultySelect.value;
        log(`⚙️ Dificuldade: ${state.difficulty}`);
      });
    }

    if (el.btnStartShift) el.btnStartShift.addEventListener("click", startShift);
    if (el.btnEndShift) el.btnEndShift.addEventListener("click", endShift);

    if (el.btnAnswer) el.btnAnswer.addEventListener("click", answerNext);
    if (el.btnHold) el.btnHold.addEventListener("click", holdCall);

    if (el.btnDispatch) el.btnDispatch.addEventListener("click", dispatchSelectedUnit);
    if (el.btnDismiss) el.btnDismiss.addEventListener("click", dismissCall);
  }

  // ----------------------------
  // Init
  // ----------------------------
  function init() {
    bindDynamicUI();
    populateCities();

    if (el.agencySelect) state.agency = el.agencySelect.value || "police";
    if (el.difficultySelect) state.difficulty = el.difficultySelect.value || "normal";
    if (el.citySelect) state.cityId = el.citySelect.value || (getCities()[0]?.id || "sp_sim");

    if (el.btnEndShift) el.btnEndShift.disabled = true;

    renderUnits();
    renderAll();

    log("✅ Sistema pronto. Clique em INICIAR TURNO.");
    log("ℹ️ Se as perguntas não aparecerem, confira se você substituiu data/calls.js corretamente.");
  }

  window.__LCDO = { state };

  document.addEventListener("DOMContentLoaded", () => {
    try {
      init();
      bind();
    } catch (e) {
      console.error(e);
      log("❌ Erro ao iniciar (veja console).");
    }
  });
})();