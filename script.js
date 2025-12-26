/*
 * Last Call Dispatch Operator – Phase (CAD + Multi-Dispatch + Typewriter)
 *
 * Regras desta versão:
 * - Jogo 100% HTML/CSS/JS (sem build, sem libs, pronto para GitHub Pages/Vercel)
 * - Mobile-first: abas (Chamada / CAD / Mapa / Unidades)
 * - Chamada por texto com efeito máquina de escrever
 * - Incidentes no CAD com estados: Registrada → Despachada → Em rota → No local → Encerrada
 * - Despacho com múltiplas unidades (seleção por checkbox + despacho recomendado)
 * - Variedade: trote / leve / médio / grave + eventos surpresa no meio da ligação
 *
 * Importante:
 * - Este é um protótipo sólido e expansível. Você pode aumentar conteúdo adicionando mais "CALL_TEMPLATES"
 *   e unidades nas cidades sem mexer na lógica principal.
 */

(() => {
  'use strict';

  /* ----------------------------- Helpers ----------------------------- */

  const GRID_SIZE = 10;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function nowMs() { return Date.now(); }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function priorityLabel(p) {
    switch (p) {
      case 0: return 'P0 (Crítico)';
      case 1: return 'P1 (Alto)';
      case 2: return 'P2 (Médio)';
      default: return 'P3 (Baixo)';
    }
  }

  function priorityBadgeClass(p) {
    return p === 0 ? 'p0' : p === 1 ? 'p1' : p === 2 ? 'p2' : 'p3';
  }

  /* ------------------------------ Audio ------------------------------ */

  class AudioFX {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.ringInterval = null;
    }

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this.stopRing();
    }

    ensure() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      return this.ctx;
    }

    beep(freq = 880, durMs = 60, type = 'sine', gain = 0.03) {
      const ctx = this.ensure();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + durMs / 1000);
    }

    click() { this.beep(1200, 25, 'square', 0.02); }
    ok() { this.beep(740, 65, 'sine', 0.03); this.beep(988, 65, 'sine', 0.03); }
    warn() { this.beep(220, 120, 'sawtooth', 0.03); }

    startRing() {
      if (!this.enabled) return;
      this.stopRing();
      // ring pattern
      this.ringInterval = setInterval(() => {
        this.beep(440, 120, 'square', 0.04);
        setTimeout(() => this.beep(660, 120, 'square', 0.04), 160);
      }, 900);
    }

    stopRing() {
      if (this.ringInterval) clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  /* ------------------------------ Data ------------------------------- */

  const CITIES = {
    saopaulo: {
      id: 'saopaulo',
      label: 'São Paulo (BR)',
      numbers: { police: '190', fire: '193', unified: '190/193' },
      defaultCenter: { x: 4, y: 5 },
      // Units (id, name, tags, service, speed)
      units: [
        { id: 'VTR-01', name: 'Polícia Área (VTR)', tags: ['police', 'patrol'], service: 'police', speed: 1 },
        { id: 'VTR-02', name: 'Polícia Área (VTR)', tags: ['police', 'patrol'], service: 'police', speed: 1 },
        { id: 'ROTA-01', name: 'ROTA (Tática)', tags: ['police', 'tactical'], service: 'police', speed: 1 },
        { id: 'CHOQ-01', name: 'Choque (Distúrbios)', tags: ['police', 'riot'], service: 'police', speed: 1 },
        { id: 'GATE-01', name: 'GATE (Anti-bomba)', tags: ['police', 'bomb'], service: 'police', speed: 1 },
        { id: 'AGUIA-01', name: 'Águia (Helicóptero)', tags: ['police', 'air'], service: 'police', speed: 2 },

        { id: 'ABTR-01', name: 'Auto Bomba (Bombeiros)', tags: ['fire', 'engine'], service: 'fire', speed: 1 },
        { id: 'RESG-01', name: 'Resgate (Desencarceramento)', tags: ['fire', 'rescue'], service: 'fire', speed: 1 },
        { id: 'HAZM-01', name: 'HazMat (Químicos)', tags: ['fire', 'hazmat'], service: 'fire', speed: 1 },
        { id: 'USB-01', name: 'Ambulância (USB)', tags: ['medical', 'ems-basic'], service: 'medical', speed: 1 },
      ],
    },
    newyork: {
      id: 'newyork',
      label: 'Nova York (EUA)',
      numbers: { unified: '911' },
      defaultCenter: { x: 5, y: 4 },
      units: [
        { id: 'PD-11', name: 'NYPD Patrol', tags: ['police', 'patrol'], service: 'police', speed: 1 },
        { id: 'PD-12', name: 'NYPD Patrol', tags: ['police', 'patrol'], service: 'police', speed: 1 },
        { id: 'SWAT-1', name: 'SWAT', tags: ['police', 'tactical'], service: 'police', speed: 1 },
        { id: 'BOMB-1', name: 'Bomb Squad', tags: ['police', 'bomb'], service: 'police', speed: 1 },
        { id: 'AIR-1', name: 'Aviation Unit', tags: ['police', 'air'], service: 'police', speed: 2 },
        { id: 'SHF-1', name: 'Sheriff', tags: ['police', 'sheriff'], service: 'police', speed: 1 },

        { id: 'FDNY-E1', name: 'FDNY Engine', tags: ['fire', 'engine'], service: 'fire', speed: 1 },
        { id: 'FDNY-R1', name: 'FDNY Rescue', tags: ['fire', 'rescue'], service: 'fire', speed: 1 },
        { id: 'EMS-1', name: 'EMS Ambulance', tags: ['medical', 'ems-basic'], service: 'medical', speed: 1 },
      ],
    },
  };

  /*
   * CALL_TEMPLATES
   * - city: 'saopaulo' | 'newyork' | 'any'
   * - category: 'police'|'fire'|'medical'|'mixed'
   * - severity: 'prank'|'low'|'mid'|'high'
   * - basePriority: 0..3
   * - code: short code name for CAD
   * - requiredTags: tags that MUST be present in dispatched units for best outcome
   * - optionalTags: tags that improve outcome
   * - script: steps player can pick
   * - twists: optional surprise events
   */

  const CALL_TEMPLATES = [
    // --- TROTES / BAIXO ---
    {
      id: 'prank_ufo',
      city: 'saopaulo',
      category: 'police',
      severity: 'prank',
      basePriority: 3,
      code: 'Trote / Denúncia falsa',
      requiredTags: [], // none
      optionalTags: [],
      callerAvatar: 'civil',
      intro: (ctx) => `Chamador: Eu vi um OVNI pousando no meu quintal! É uma invasão alienígena!`,
      locationHint: (ctx) => `Endereço: "é aqui perto..." (fala confusa)`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: ${ctx.number} – Qual a sua emergência?`,
          options: [
            { label: 'Perguntar endereço', action: 'ASK_LOCATION' },
            { label: 'Perguntar detalhes', action: 'ASK_DETAILS' },
            { label: 'Encerrar por trote', action: 'MARK_PRANK' },
            { label: 'Manter na linha e acalmar', action: 'CALM' },
          ],
        },
      ],
      resolveHint: 'Trotes existem na vida real. Encerrar corretamente poupa recursos.',
    },
    {
      id: 'noise_complaint',
      city: 'any',
      category: 'police',
      severity: 'low',
      basePriority: 3,
      code: 'Perturbação do sossego',
      requiredTags: ['patrol'],
      optionalTags: [],
      intro: (ctx) => `Chamador: Meu vizinho está com som alto desde cedo. Eu não aguento mais...`,
      locationHint: (ctx) => `Chamador: É na minha rua, perto de um mercadinho.`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: Certo. Preciso do endereço e referência.`,
          options: [
            { label: 'Perguntar endereço', action: 'ASK_LOCATION' },
            { label: 'Perguntar se há ameaça/violência', action: 'ASK_THREAT' },
            { label: 'Orientar a registrar ocorrência (sem viatura)', action: 'SUGGEST_REPORT' },
            { label: 'Despachar viatura de área', action: 'OPEN_DISPATCH' },
          ],
        },
      ],
      resolveHint: 'Chamadas leves exigem bom julgamento: mandar ou orientar canais adequados.',
    },

    // --- MÉDIO ---
    {
      id: 'car_crash_trapped',
      city: 'any',
      category: 'mixed',
      severity: 'mid',
      basePriority: 1,
      code: 'Acidente com vítima presa',
      requiredTags: ['rescue', 'ems-basic'],
      optionalTags: ['engine'],
      intro: (ctx) => `Chamador: Teve uma batida feia! Tem gente presa no carro e está saindo fumaça!`,
      locationHint: (ctx) => `Chamador: Foi perto de um viaduto, eu não sei o número...`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: Respire. Você está em segurança? Preciso do local exato.`,
          options: [
            { label: 'Perguntar endereço/referência', action: 'ASK_LOCATION' },
            { label: 'Perguntar quantidade de vítimas', action: 'ASK_VICTIMS' },
            { label: 'Orientar: não mexer na vítima + sinalizar local', action: 'GIVE_SAFETY' },
            { label: 'Despachar Resgate + Ambulância', action: 'OPEN_DISPATCH' },
          ],
        },
      ],
      twists: [
        {
          id: 'fuel_leak',
          chance: 0.35,
          text: (ctx) => `Chamador: Meu Deus… está vazando combustível no chão!`,
          addRequiredTags: ['engine'],
          priorityDelta: -1,
          note: 'Risco de incêndio (vazamento)',
        },
      ],
      resolveHint: 'Acidentes com presos nas ferragens exigem resgate e suporte médico rápido.',
    },

    // --- GRAVE ---
    {
      id: 'armed_robbery',
      city: 'any',
      category: 'police',
      severity: 'high',
      basePriority: 0,
      code: 'Roubo armado em andamento',
      requiredTags: ['patrol'],
      optionalTags: ['tactical', 'air'],
      intro: (ctx) => `Chamador: Estão roubando a farmácia! Tem uma arma! Por favor, manda a polícia AGORA!`,
      locationHint: (ctx) => `Chamador: Eu estou escondido. É numa avenida grande, perto de um ponto de ônibus.`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: Entendi. NÃO se exponha. Preciso do local e descrição.`,
          options: [
            { label: 'Perguntar endereço/referência', action: 'ASK_LOCATION' },
            { label: 'Perguntar descrição do suspeito/veículo', action: 'ASK_SUSPECT' },
            { label: 'Orientar a manter-se escondido/silencioso', action: 'GIVE_SAFETY' },
            { label: 'Despachar Polícia (e reforço se disponível)', action: 'OPEN_DISPATCH' },
          ],
        },
      ],
      twists: [
        {
          id: 'shots_fired',
          chance: 0.32,
          text: (ctx) => `Chamador: Eu ouvi um disparo! Tem alguém ferido!`,
          addRequiredTags: ['ems-basic'],
          addOptionalTags: ['tactical'],
          priorityDelta: 0,
          note: 'Tiros / ferido',
        },
      ],
      resolveHint: 'Eventos armados: segurança do chamador + despacho rápido e proporcional.',
    },

    {
      id: 'structure_fire',
      city: 'any',
      category: 'fire',
      severity: 'high',
      basePriority: 0,
      code: 'Incêndio em edificação',
      requiredTags: ['engine'],
      optionalTags: ['rescue', 'ems-basic', 'hazmat'],
      intro: (ctx) => `Chamador: O apartamento do vizinho está pegando fogo! Tem muita fumaça no corredor!`,
      locationHint: (ctx) => `Chamador: É num prédio alto. Eu não sei se tem gente presa.`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: Certo. NÃO use elevador. Preciso do endereço e do andar.`,
          options: [
            { label: 'Perguntar endereço/andar', action: 'ASK_LOCATION' },
            { label: 'Perguntar se há pessoas presas', action: 'ASK_VICTIMS' },
            { label: 'Orientar evacuação / fechar portas', action: 'GIVE_FIRE_SAFETY' },
            { label: 'Despachar Auto Bomba + Apoio', action: 'OPEN_DISPATCH' },
          ],
        },
      ],
      twists: [
        {
          id: 'gas_cylinders',
          chance: 0.22,
          text: (ctx) => `Chamador: Tem botijão de gás no apartamento!`,
          addRequiredTags: [],
          addOptionalTags: ['hazmat'],
          priorityDelta: 0,
          note: 'Risco de explosão / gás',
        },
      ],
      resolveHint: 'Incêndio: evacuação + equipe de combate e possível resgate.',
    },

    // --- MÉDICO CRÍTICO ---
    {
      id: 'cardiac_arrest',
      city: 'any',
      category: 'medical',
      severity: 'high',
      basePriority: 0,
      code: 'Parada cardiorrespiratória',
      requiredTags: ['ems-basic'],
      optionalTags: [],
      intro: (ctx) => `Chamador: Meu pai caiu no chão… ele não respira! Socorro!`,
      locationHint: (ctx) => `Chamador: Eu estou em casa… eu passo o endereço, por favor!`,
      steps: [
        {
          id: 's1',
          text: (ctx) => `Operador: Eu vou te ajudar. Preciso do endereço agora.`,
          options: [
            { label: 'Perguntar endereço', action: 'ASK_LOCATION' },
            { label: 'Instruir RCP (compressões)', action: 'GIVE_CPR' },
            { label: 'Perguntar se está consciente', action: 'ASK_BREATHING' },
            { label: 'Despachar Ambulância', action: 'OPEN_DISPATCH' },
          ],
        },
      ],
      twists: [
        {
          id: 'gasping',
          chance: 0.20,
          text: (ctx) => `Chamador: Ele está fazendo um barulho estranho… tipo engasgado…`,
          addRequiredTags: [],
          addOptionalTags: [],
          priorityDelta: 0,
          note: 'Respiração agônica (gasping)',
        },
      ],
      resolveHint: 'Parada: RCP por telefone + despacho imediato.',
    },
  ];

  const DIFFICULTY = {
    easy:   { callIntervalSec: 16, maxActiveIncidents: 3, callTimeMultiplier: 1.25, penaltyMultiplier: 0.8, twistChanceMultiplier: 0.85 },
    normal: { callIntervalSec: 12, maxActiveIncidents: 4, callTimeMultiplier: 1.0,  penaltyMultiplier: 1.0, twistChanceMultiplier: 1.0 },
    hard:   { callIntervalSec: 9,  maxActiveIncidents: 6, callTimeMultiplier: 0.85, penaltyMultiplier: 1.25, twistChanceMultiplier: 1.15 },
  };

  /* ------------------------------ Game ------------------------------- */

  class Game {
    constructor() {
      // Elements
      this.el = {
        startBtn: document.getElementById('start-btn'),
        pauseBtn: document.getElementById('pause-btn'),
        restartBtn: document.getElementById('restart-btn'),
        resultRestart: document.getElementById('result-restart'),

        shiftTimer: document.getElementById('shift-timer'),
        callTimer: document.getElementById('call-timer'),
        score: document.getElementById('score'),
        callsHandled: document.getElementById('calls-handled'),

        callDialogue: document.getElementById('call-dialogue'),
        callOptions: document.getElementById('call-options'),
        callPill: document.getElementById('call-pill'),
        callLocation: document.getElementById('call-location'),
        callType: document.getElementById('call-type'),
        callPriority: document.getElementById('call-priority'),

        mapGrid: document.getElementById('map-grid'),
        mapPill: document.getElementById('map-pill'),

        cadPill: document.getElementById('cad-pill'),
        cadItems: document.getElementById('cad-items'),
        cadDetails: document.getElementById('cad-details'),
        cadLog: document.getElementById('cad-log'),

        unitsList: document.getElementById('units-list'),
        unitsPill: document.getElementById('units-pill'),

        btnDispatchOpen: document.getElementById('btn-dispatch-open'),
        btnEscalate: document.getElementById('btn-escalate'),
        btnClose: document.getElementById('btn-close'),

        btnDispatchSelected: document.getElementById('btn-dispatch-selected'),
        btnDispatchRecommended: document.getElementById('btn-dispatch-recommended'),
        dispatchHint: document.getElementById('dispatch-hint'),

        resultSection: document.getElementById('result-section'),
        resultText: document.getElementById('result-text'),
        main: document.getElementById('main'),

        citySelect: document.getElementById('city-select'),
        agencySelect: document.getElementById('agency-select'),
        difficultySelect: document.getElementById('difficulty-select'),

        toggleAudio: document.getElementById('toggle-audio'),
        toggleTypewriter: document.getElementById('toggle-typewriter'),

        tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
        panels: Array.from(document.querySelectorAll('.panel')),
      };

      // Systems
      this.audio = new AudioFX();

      // State
      this.running = false;
      this.paused = false;

      this.shiftSeconds = 0;
      this.shiftLengthSeconds = 6 * 60; // 6 minutes per shift (prototype). Later: 30+ min.

      this.score = 0;
      this.callsHandled = 0;

      this.city = null;
      this.agency = 'police';
      this.difficulty = 'normal';

      this.units = [];
      this.incidents = [];
      this.activeIncidentId = null;

      this.currentCall = null;
      this.callSecondsLeft = 0;
      this.callStepIndex = 0;
      this.callFlags = {
        locationKnown: false,
        detailsKnown: false,
        gaveCPR: false,
        gaveFireSafety: false,
        gaveSafety: false,
        markedPrank: false,
      };

      this.intervals = {
        shift: null,
        logic: null,
        callSpawner: null,
        callTimer: null,
      };

      // Map grid cache
      this.cellEls = [];

      // Bind
      this.el.startBtn.addEventListener('click', () => this.start());
      this.el.pauseBtn.addEventListener('click', () => this.togglePause());
      this.el.restartBtn.addEventListener('click', () => this.resetAndStart());
      this.el.resultRestart.addEventListener('click', () => this.resetAndStart());

      this.el.citySelect.addEventListener('change', () => {
        if (this.running) return;
        this.el.citySelect.blur();
      });
      this.el.agencySelect.addEventListener('change', () => {
        if (this.running) return;
        this.el.agencySelect.blur();
      });
      this.el.difficultySelect.addEventListener('change', () => {
        if (this.running) return;
        this.el.difficultySelect.blur();
      });

      this.el.toggleAudio.addEventListener('change', () => {
        this.audio.setEnabled(this.el.toggleAudio.checked);
      });

      this.el.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.el.tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.setActiveTab(btn.dataset.tab);
        });
      });

      // CAD buttons
      this.el.btnDispatchOpen.addEventListener('click', () => this.openDispatchPanel());
      this.el.btnEscalate.addEventListener('click', () => this.escalateIncident());
      this.el.btnClose.addEventListener('click', () => this.forceCloseIncident());

      this.el.btnDispatchSelected.addEventListener('click', () => this.dispatchSelected());
      this.el.btnDispatchRecommended.addEventListener('click', () => this.dispatchRecommended());

      // Init UI
      this.buildMap();
      this.setActiveTab('call');
      this.renderAll();
      this.logCAD('Sistema pronto. Configure cidade/agência e inicie o turno.');
    }

    /* ---------------------------- Lifecycle --------------------------- */

    start() {
      if (this.running) return;

      this.city = CITIES[this.el.citySelect.value] || CITIES.saopaulo;
      this.agency = this.el.agencySelect.value || 'police';
      this.difficulty = this.el.difficultySelect.value || 'normal';

      this.running = true;
      this.paused = false;

      // Reset stats
      this.shiftSeconds = 0;
      this.score = 0;
      this.callsHandled = 0;

      // Create units positioned near center (random spread)
      this.units = this.city.units.map(u => ({
        ...u,
        x: clamp(this.city.defaultCenter.x + randInt(-2, 2), 0, GRID_SIZE - 1),
        y: clamp(this.city.defaultCenter.y + randInt(-2, 2), 0, GRID_SIZE - 1),
        status: 'available', // available | enroute | onscene | returning
        target: null,        // {x,y, incidentId}
        eta: 0,
        resolveAt: 0,
        selected: false,
      }));

      this.incidents = [];
      this.activeIncidentId = null;

      this.resetCall();

      // UI
      this.el.startBtn.disabled = true;
      this.el.pauseBtn.disabled = false;
      this.el.restartBtn.classList.add('hidden');

      this.el.resultSection.classList.add('hidden');
      this.el.main.classList.remove('hidden');

      // Timers
      const diff = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;

      this.clearIntervals();
      this.intervals.shift = setInterval(() => {
        if (this.paused) return;
        this.shiftSeconds += 1;
        if (this.shiftSeconds >= this.shiftLengthSeconds) {
          this.endShift();
        }
        this.updateHUD();
      }, 1000);

      // Logic tick (movement + resolutions)
      this.intervals.logic = setInterval(() => {
        if (this.paused) return;
        this.tickUnits();
        this.tickIncidents();
        this.renderMap();
        this.renderUnits();
        this.renderCAD();
      }, 1000);

      // Call spawner
      this.intervals.callSpawner = setInterval(() => {
        if (this.paused) return;
        this.spawnCallIfPossible();
      }, diff.callIntervalSec * 1000);

      // Spawn first call quickly
      setTimeout(() => this.spawnCallIfPossible(true), 700);

      this.updateHUD();
      this.renderAll();

      this.logCAD(`Turno iniciado em ${this.city.label}. Número: ${this.city.numbers.unified || this.city.numbers[this.agency] || 'Emergência'}.`);
    }

    resetAndStart() {
      this.clearIntervals();
      this.running = false;
      this.paused = false;
      this.el.startBtn.disabled = false;
      this.el.pauseBtn.disabled = true;
      this.el.restartBtn.classList.add('hidden');
      this.el.resultSection.classList.add('hidden');
      this.el.main.classList.remove('hidden');
      this.start();
    }

    togglePause() {
      if (!this.running) return;
      this.paused = !this.paused;
      this.el.pauseBtn.textContent = this.paused ? 'Retomar' : 'Pausar';
      this.el.mapPill.textContent = this.paused ? 'Pausado' : 'Toque em um incidente';
      if (this.paused) this.audio.stopRing();
    }

    endShift() {
      this.clearIntervals();
      this.running = false;
      this.paused = false;

      this.el.startBtn.disabled = false;
      this.el.pauseBtn.disabled = true;
      this.el.pauseBtn.textContent = 'Pausar';
      this.el.restartBtn.classList.remove('hidden');

      this.el.resultSection.classList.remove('hidden');
      this.el.resultText.textContent =
        `Você atendeu ${this.callsHandled} chamadas e fez ${this.score} pontos. ` +
        `Incidentes ativos: ${this.incidents.filter(i => !i.closed).length}.`;

      this.logCAD('Fim de turno.');
    }

    clearIntervals() {
      Object.values(this.intervals).forEach(id => { if (id) clearInterval(id); });
      this.intervals = { shift: null, logic: null, callSpawner: null, callTimer: null };
    }

    /* ------------------------------ Map ------------------------------ */

    buildMap() {
      this.el.mapGrid.innerHTML = '';
      this.cellEls = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.x = String(x);
          cell.dataset.y = String(y);

          const dot = document.createElement('div');
          dot.className = 'dot';
          dot.textContent = '';
          cell.appendChild(dot);

          cell.addEventListener('click', () => {
            if (!this.running) return;
            this.onMapCellClick(x, y);
          });

          this.el.mapGrid.appendChild(cell);
          this.cellEls.push(cell);
        }
      }
    }

    cellAt(x, y) {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
      return this.cellEls[y * GRID_SIZE + x];
    }

    onMapCellClick(x, y) {
      // Select incident if exists at cell
      const incident = this.incidents.find(i => !i.closed && i.x === x && i.y === y);
      if (incident) {
        this.selectIncident(incident.id);
        this.audio.click();
        return;
      }
      // else no incident: do nothing
    }

    renderMap() {
      // Clear cells
      for (const cell of this.cellEls) {
        cell.className = 'cell';
        cell.querySelector('.dot').textContent = '';
      }

      // Draw incidents
      for (const inc of this.incidents) {
        if (inc.closed) continue;
        const cell = this.cellAt(inc.x, inc.y);
        if (!cell) continue;
        cell.classList.add('incident', `p${inc.priority}`);
        cell.querySelector('.dot').textContent = `#${inc.shortId}`;
        if (this.activeIncidentId === inc.id) cell.classList.add('selected');
      }

      // Draw units (units overlay cell – if cell already incident, we'll show unit tag in tooltip-ish)
      for (const u of this.units) {
        const cell = this.cellAt(u.x, u.y);
        if (!cell) continue;
        cell.classList.add('unit');
        const dot = cell.querySelector('.dot');
        if (!dot.textContent) dot.textContent = u.id.split('-')[0];
      }
    }

    /* ------------------------------ CAD ------------------------------ */

    logCAD(message) {
      const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const line = document.createElement('div');
      line.textContent = `[${t}] ${message}`;
      this.el.cadLog.appendChild(line);
      this.el.cadLog.scrollTop = this.el.cadLog.scrollHeight;
    }

    renderCAD() {
      const activeCount = this.incidents.filter(i => !i.closed).length;
      this.el.cadPill.textContent = `${activeCount} ativos`;

      // list
      this.el.cadItems.innerHTML = '';
      const ordered = [...this.incidents].filter(i => !i.closed).sort((a,b) => a.priority - b.priority || a.createdAt - b.createdAt);

      for (const inc of ordered) {
        const row = document.createElement('div');
        row.className = 'cad-item' + (this.activeIncidentId === inc.id ? ' active' : '');
        row.addEventListener('click', () => this.selectIncident(inc.id));

        const idEl = document.createElement('div');
        idEl.textContent = `#${inc.shortId}`;

        const codeEl = document.createElement('div');
        codeEl.textContent = inc.code;

        const pEl = document.createElement('div');
        const badge = document.createElement('span');
        badge.className = `badge ${priorityBadgeClass(inc.priority)}`;
        badge.textContent = `P${inc.priority}`;
        pEl.appendChild(badge);

        const stEl = document.createElement('div');
        stEl.textContent = inc.statusLabel;

        row.appendChild(idEl);
        row.appendChild(codeEl);
        row.appendChild(pEl);
        row.appendChild(stEl);

        this.el.cadItems.appendChild(row);
      }

      // details
      this.renderCADDetails();
    }

    renderCADDetails() {
      const inc = this.incidents.find(i => i.id === this.activeIncidentId) || null;
      if (!inc) {
        this.el.cadDetails.innerHTML = `<div class="muted">Selecione um incidente para ver detalhes.</div>`;
        this.el.btnDispatchOpen.disabled = true;
        this.el.btnEscalate.disabled = true;
        this.el.btnClose.disabled = true;

        this.el.btnDispatchSelected.disabled = true;
        this.el.btnDispatchRecommended.disabled = true;
        this.el.dispatchHint.textContent = 'Selecione um incidente no CAD/Mapa e marque as unidades para despachar.';
        return;
      }

      const assigned = inc.assignedUnitIds.map(id => this.units.find(u => u.id === id)?.name || id);

      this.el.cadDetails.innerHTML = `
        <div><b>Código:</b> ${inc.code}</div>
        <div><b>Prioridade:</b> ${priorityLabel(inc.priority)}</div>
        <div><b>Local:</b> (${inc.x}, ${inc.y})</div>
        <div><b>Status:</b> ${inc.statusLabel}</div>
        <div><b>Requisitos:</b> ${inc.requiredTags.length ? inc.requiredTags.join(', ') : '—'}</div>
        <div><b>Opcional:</b> ${inc.optionalTags.length ? inc.optionalTags.join(', ') : '—'}</div>
        <div><b>Observações:</b> ${inc.notes.length ? inc.notes.map(n => '• ' + n).join('<br/>') : '—'}</div>
        <div><b>Unidades:</b> ${assigned.length ? assigned.map(n => '• ' + n).join('<br/>') : '—'}</div>
      `;

      this.el.btnDispatchOpen.disabled = false;
      this.el.btnEscalate.disabled = false;
      this.el.btnClose.disabled = false;

      this.el.btnDispatchSelected.disabled = false;
      this.el.btnDispatchRecommended.disabled = false;
      this.el.dispatchHint.textContent = `Incidente #${inc.shortId} selecionado. Marque as unidades e despache.`;
    }

    selectIncident(incidentId) {
      this.activeIncidentId = incidentId;
      this.renderCAD();
      this.renderMap();
      this.renderUnits();
      const inc = this.incidents.find(i => i.id === incidentId);
      if (inc) this.el.mapPill.textContent = `Selecionado: #${inc.shortId} • ${inc.code}`;
    }

    escalateIncident() {
      const inc = this.incidents.find(i => i.id === this.activeIncidentId);
      if (!inc || inc.closed) return;
      const old = inc.priority;
      inc.priority = clamp(inc.priority - 1, 0, 3);
      inc.statusLabel = inc.statusLabel || 'Registrada';
      if (inc.priority !== old) {
        inc.notes.push('Escalada manualmente pelo operador.');
        this.score += 3;
        this.logCAD(`Incidente #${inc.shortId} escalado para P${inc.priority}.`);
        this.audio.warn();
        this.updateHUD();
      }
      this.renderCAD();
      this.renderMap();
    }

    forceCloseIncident() {
      const inc = this.incidents.find(i => i.id === this.activeIncidentId);
      if (!inc || inc.closed) return;
      inc.closed = true;
      inc.status = 'closed';
      inc.statusLabel = 'Encerrada';
      this.score -= 4;
      this.callsHandled += 1;
      this.logCAD(`Incidente #${inc.shortId} encerrado manualmente (sem simular resultado).`);
      this.audio.warn();
      this.activeIncidentId = null;
      this.updateHUD();
      this.renderAll();
    }

    /* ----------------------------- Units ----------------------------- */

    renderUnits() {
      const available = this.units.filter(u => u.status === 'available').length;
      this.el.unitsPill.textContent = `${available} disponíveis`;

      this.el.unitsList.innerHTML = '';
      for (const u of this.units) {
        const row = document.createElement('div');
        row.className = 'unit-item';

        const left = document.createElement('div');
        left.className = 'unit-left';

        const name = document.createElement('div');
        name.className = 'unit-name';
        name.textContent = `${u.id} • ${u.name}`;

        const meta = document.createElement('div');
        meta.className = 'unit-meta';
        meta.textContent = `Tags: ${u.tags.join(', ')} • Pos: (${u.x},${u.y}) • Vel: ${u.speed}x`;

        left.appendChild(name);
        left.appendChild(meta);

        const right = document.createElement('div');
        right.className = 'unit-right';

        const status = document.createElement('span');
        status.className = `status ${u.status === 'available' ? 'available' : 'busy'}`;
        status.textContent = u.status === 'available' ? 'Disponível' : (u.status === 'enroute' ? 'Em rota' : (u.status === 'onscene' ? 'No local' : 'Retornando'));

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!u.selected;
        cb.disabled = (u.status !== 'available') || !this.activeIncidentId;
        cb.addEventListener('change', () => {
          u.selected = cb.checked;
          this.audio.click();
        });

        right.appendChild(status);
        right.appendChild(cb);

        row.appendChild(left);
        row.appendChild(right);

        this.el.unitsList.appendChild(row);
      }
    }

    openDispatchPanel() {
      this.setActiveTab('units');
      this.audio.click();
    }

    dispatchSelected() {
      const inc = this.incidents.find(i => i.id === this.activeIncidentId);
      if (!inc || inc.closed) return;

      const selected = this.units.filter(u => u.selected && u.status === 'available');
      if (!selected.length) {
        this.logCAD('Nenhuma unidade selecionada para despacho.');
        this.audio.warn();
        return;
      }

      this.dispatchUnitsToIncident(selected, inc, { reason: 'manual' });
      // Clear selection
      for (const u of this.units) u.selected = false;
      this.renderUnits();
    }

    dispatchRecommended() {
      const inc = this.incidents.find(i => i.id === this.activeIncidentId);
      if (!inc || inc.closed) return;

      const picks = this.pickRecommendedUnits(inc);
      if (!picks.length) {
        this.logCAD('Sem unidades disponíveis para despacho recomendado.');
        this.audio.warn();
        return;
      }

      this.dispatchUnitsToIncident(picks, inc, { reason: 'recommended' });
      this.renderUnits();
    }

    pickRecommendedUnits(inc) {
      const available = this.units.filter(u => u.status === 'available');
      if (!available.length) return [];

      // We try to fulfill requiredTags by choosing nearest unit for each tag.
      const chosen = [];
      const used = new Set();

      const incidentPos = { x: inc.x, y: inc.y };

      for (const tag of inc.requiredTags) {
        const candidates = available.filter(u => !used.has(u.id) && u.tags.includes(tag));
        if (!candidates.length) continue;
        candidates.sort((a,b) => manhattan(a, incidentPos) - manhattan(b, incidentPos));
        const pickU = candidates[0];
        chosen.push(pickU);
        used.add(pickU.id);
      }

      // If still nothing and it's police/fire/medical, pick one nearest general patrol/engine/ems
      if (!chosen.length) {
        let fallbackTag = 'patrol';
        if (inc.category === 'fire') fallbackTag = 'engine';
        if (inc.category === 'medical') fallbackTag = 'ems-basic';
        const candidates = available.filter(u => u.tags.includes(fallbackTag));
        candidates.sort((a,b) => manhattan(a, incidentPos) - manhattan(b, incidentPos));
        if (candidates[0]) { chosen.push(candidates[0]); used.add(candidates[0].id); }
      }

      // Add optional if available and incident is high priority
      if (inc.priority <= 1) {
        for (const opt of inc.optionalTags) {
          const candidates = available.filter(u => !used.has(u.id) && u.tags.includes(opt));
          candidates.sort((a,b) => manhattan(a, incidentPos) - manhattan(b, incidentPos));
          if (candidates[0]) { chosen.push(candidates[0]); used.add(candidates[0].id); }
          if (chosen.length >= 4) break;
        }
      }

      // Cap to 4 units
      return chosen.slice(0, 4);
    }

    dispatchUnitsToIncident(units, inc, { reason }) {
      const incidentPos = { x: inc.x, y: inc.y };

      for (const u of units) {
        if (u.status !== 'available') continue;

        u.status = 'enroute';
        u.target = { x: inc.x, y: inc.y, incidentId: inc.id };
        u.eta = manhattan(u, incidentPos); // crude eta in "cells"
        u.resolveAt = 0;
        u.selected = false;

        if (!inc.assignedUnitIds.includes(u.id)) inc.assignedUnitIds.push(u.id);
      }

      // Update incident status
      if (inc.status === 'registered') {
        inc.status = 'dispatched';
        inc.statusLabel = 'Despachada';
      } else if (inc.status === 'dispatched') {
        inc.statusLabel = 'Despachada (reforço)';
      }

      this.logCAD(`Despacho ${reason === 'recommended' ? 'recomendado' : 'manual'}: incidente #${inc.shortId} recebeu ${units.length} unidade(s).`);
      this.audio.ok();
      this.score += Math.max(1, 2 - inc.priority);
      this.updateHUD();
      this.renderAll();
    }

    /* ------------------------------ Calls ----------------------------- */

    resetCall() {
      this.currentCall = null;
      this.callSecondsLeft = 0;
      this.callStepIndex = 0;
      this.callFlags = { locationKnown: false, detailsKnown: false, gaveCPR: false, gaveFireSafety: false, gaveSafety: false, markedPrank: false };

      this.el.callDialogue.innerHTML = '';
      this.el.callOptions.innerHTML = '';
      this.el.callPill.textContent = 'Aguardando...';
      this.el.callLocation.textContent = '—';
      this.el.callType.textContent = '—';
      this.el.callPriority.textContent = '—';
      this.el.callTimer.textContent = '--:--';
    }

    spawnCallIfPossible(force = false) {
      if (!this.running || this.paused) return;
      const diff = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;

      // If already on a call, don't interrupt (later: queue calls)
      if (this.currentCall) return;

      // Too many incidents active? slow down call rate
      const active = this.incidents.filter(i => !i.closed).length;
      if (!force && active >= diff.maxActiveIncidents) return;

      // Make a call
      const template = this.pickCallTemplate();
      this.beginCall(template);
    }

    pickCallTemplate() {
      const cityId = this.el.citySelect.value;
      const pool = CALL_TEMPLATES.filter(t => (t.city === 'any' || t.city === cityId));
      // Weight by severity (more low/mid than high)
      const weighted = [];
      for (const t of pool) {
        const w = t.severity === 'prank' ? 2 : t.severity === 'low' ? 6 : t.severity === 'mid' ? 5 : 3;
        for (let i = 0; i < w; i++) weighted.push(t);
      }
      return pick(weighted.length ? weighted : pool);
    }

    beginCall(template) {
      const ctx = this.makeCallContext(template);

      this.currentCall = {
        template,
        ctx,
        // Incidente poderá ser criado quando local for conhecido OU no despacho
        incidentId: null,
        createdAt: nowMs(),
        didTwist: false,
      };

      const diff = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;
      const baseCallTime = template.severity === 'prank' ? 25 : template.severity === 'low' ? 35 : template.severity === 'mid' ? 48 : 60;
      this.callSecondsLeft = Math.round(baseCallTime * diff.callTimeMultiplier);

      this.el.callPill.textContent = `Ligação (${this.numberForTemplate(template)})`;
      this.el.callType.textContent = template.code;
      this.el.callPriority.textContent = priorityLabel(template.basePriority);

      this.audio.startRing();

      // Answer call automatically after short delay (UX)
      setTimeout(() => {
        this.audio.stopRing();
        this.pushLine('Sistema', `Chamada recebida. Iniciando atendimento...`, { tone: 'system' });
        this.pushLine('Chamador', template.intro(ctx));

        this.callStepIndex = 0;
        this.renderCallStep();
        this.startCallCountdown();
      }, 650);
    }

    numberForTemplate(t) {
      if (this.city.id === 'newyork') return '911';
      if (this.city.id === 'saopaulo') {
        // If it's clearly fire vs police, use respective numbers, else unified
        if (t.category === 'fire' || t.category === 'medical') return '193';
        return '190';
      }
      return this.city.numbers.unified || 'Emergência';
    }

    makeCallContext(template) {
      return {
        city: this.city.id,
        cityLabel: this.city.label,
        agency: this.agency,
        number: this.numberForTemplate(template),
      };
    }

    startCallCountdown() {
      if (this.intervals.callTimer) clearInterval(this.intervals.callTimer);
      this.intervals.callTimer = setInterval(() => {
        if (!this.running) { clearInterval(this.intervals.callTimer); return; }
        if (this.paused) return;

        this.callSecondsLeft -= 1;
        this.el.callTimer.textContent = formatTime(this.callSecondsLeft);

        // Twist event mid-call
        if (this.currentCall && !this.currentCall.didTwist) {
          const t = this.currentCall.template;
          if (t.twists && t.twists.length) {
            const diff = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;
            // try once when time reaches ~70% remaining
            const triggerPoint = Math.round((t.severity === 'high' ? 44 : 30) * diff.callTimeMultiplier);
            if (this.callSecondsLeft === triggerPoint) {
              this.maybeTriggerTwist();
            }
          }
        }

        if (this.callSecondsLeft <= 0) {
          this.onCallTimeout();
        }
      }, 1000);

      this.el.callTimer.textContent = formatTime(this.callSecondsLeft);
    }

    maybeTriggerTwist() {
      const call = this.currentCall;
      if (!call) return;
      const t = call.template;
      if (!t.twists || !t.twists.length) return;

      const diff = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;
      const twist = pick(t.twists);
      const p = clamp(twist.chance * diff.twistChanceMultiplier, 0.05, 0.95);

      call.didTwist = true;

      if (!chance(p)) return;

      // Apply twist effects
      this.pushLine('Chamador', twist.text(call.ctx));
      if (twist.note) this.pushLine('Sistema', `Atualização: ${twist.note}`, { tone: 'system' });

      // Ensure incident exists (location might not be known yet; we allow "noted")
      const inc = this.ensureIncidentExists({ allowUnknownLocation: true });

      if (inc) {
        if (twist.addRequiredTags) {
          for (const tag of twist.addRequiredTags) if (!inc.requiredTags.includes(tag)) inc.requiredTags.push(tag);
        }
        if (twist.addOptionalTags) {
          for (const tag of twist.addOptionalTags) if (!inc.optionalTags.includes(tag)) inc.optionalTags.push(tag);
        }
        if (typeof twist.priorityDelta === 'number') {
          inc.priority = clamp(inc.priority + twist.priorityDelta, 0, 3);
        }
        if (twist.note) inc.notes.push(twist.note);
        this.logCAD(`Incidente #${inc.shortId} atualizado por evolução da ocorrência.`);
        this.renderAll();
      }
    }

    onCallTimeout() {
      const call = this.currentCall;
      if (!call) return;
      clearInterval(this.intervals.callTimer);
      this.intervals.callTimer = null;

      this.pushLine('Sistema', 'Tempo excedido na ligação. A situação pode piorar.', { tone: 'system' });
      this.audio.warn();

      // Penaliza e cria incidente "mal atendido" se houve detalhes
      this.score -= Math.round(6 * (DIFFICULTY[this.difficulty]?.penaltyMultiplier || 1));
      this.updateHUD();

      // Create/keep incident; worsen priority
      const inc = this.ensureIncidentExists({ allowUnknownLocation: true });
      if (inc) {
        inc.priority = clamp(inc.priority - 1, 0, 3); // become more urgent
        inc.notes.push('Atraso no atendimento (tempo excedido).');
        this.logCAD(`Incidente #${inc.shortId} piorou por atraso na chamada.`);
      }

      this.endCurrentCall({ counted: true, reason: 'timeout' });
    }

    renderCallStep() {
      const call = this.currentCall;
      if (!call) return;

      const t = call.template;
      const step = t.steps[this.callStepIndex] || t.steps[t.steps.length - 1];

      this.el.callOptions.innerHTML = '';
      const row = document.createElement('div');
      row.className = 'option-row';

      for (const opt of step.options) {
        const btn = document.createElement('button');
        btn.textContent = opt.label;

        // style hints
        if (opt.action === 'MARK_PRANK') btn.classList.add('danger');
        if (opt.action === 'OPEN_DISPATCH') btn.classList.add('ok');

        btn.addEventListener('click', () => this.onCallAction(opt.action));
        row.appendChild(btn);
      }
      this.el.callOptions.appendChild(row);

      // Help info
      const row2 = document.createElement('div');
      row2.className = 'option-row';
      const btnEnd = document.createElement('button');
      btnEnd.textContent = 'Encerrar ligação';
      btnEnd.classList.add('danger');
      btnEnd.addEventListener('click', () => this.endCurrentCall({ counted: false, reason: 'manual_end' }));
      row2.appendChild(btnEnd);

      this.el.callOptions.appendChild(row2);
    }

    async pushLine(who, text, { tone } = {}) {
      const wrap = document.createElement('div');
      wrap.className = 'line';

      const whoEl = document.createElement('div');
      whoEl.className = 'who';
      whoEl.textContent = who;

      const textEl = document.createElement('div');
      textEl.className = 'text';

      wrap.appendChild(whoEl);
      wrap.appendChild(textEl);
      this.el.callDialogue.appendChild(wrap);
      this.el.callDialogue.scrollTop = this.el.callDialogue.scrollHeight;

      const useTypewriter = this.el.toggleTypewriter.checked && tone !== 'system';
      const speed = tone === 'system' ? 0 : 18;

      if (!useTypewriter || speed <= 0) {
        textEl.textContent = text;
        return;
      }

      textEl.textContent = '';
      for (let i = 0; i < text.length; i++) {
        textEl.textContent += text[i];
        if (this.el.toggleAudio.checked) {
          // subtle click on letters (not every letter)
          if (i % 3 === 0 && /[a-zA-Z0-9áéíóúãõç]/i.test(text[i])) this.audio.beep(980, 10, 'square', 0.008);
        }
        await new Promise(r => setTimeout(r, speed));
        this.el.callDialogue.scrollTop = this.el.callDialogue.scrollHeight;
      }
    }

    onCallAction(action) {
      if (!this.currentCall) return;
      const t = this.currentCall.template;

      this.audio.click();

      switch (action) {
        case 'ASK_LOCATION': {
          this.callFlags.locationKnown = true;
          const loc = t.locationHint(this.currentCall.ctx);
          this.el.callLocation.textContent = loc.replace(/^Chamador:\s*/i, '');
          this.pushLine('Operador', 'Qual é o endereço / referência exata?');
          this.pushLine('Chamador', loc);

          // Create incident once we have location
          this.ensureIncidentExists({ allowUnknownLocation: false });

          this.score += 2;
          break;
        }
        case 'ASK_DETAILS': {
          this.callFlags.detailsKnown = true;
          this.pushLine('Operador', 'Me diga exatamente o que está acontecendo.');
          this.pushLine('Chamador', 'É isso mesmo! Eu estou nervoso(a)…');

          this.score += 1;
          break;
        }
        case 'ASK_THREAT': {
          this.callFlags.detailsKnown = true;
          this.pushLine('Operador', 'Há ameaça, agressão ou risco imediato?');
          this.pushLine('Chamador', 'Não… é só barulho mesmo, mas está impossível dormir.');
          this.score += 1;
          break;
        }
        case 'ASK_VICTIMS': {
          this.callFlags.detailsKnown = true;
          this.pushLine('Operador', 'Quantas vítimas? Alguém preso ou ferido?');
          this.pushLine('Chamador', 'Tem uma pessoa presa e outra chorando de dor.');
          this.score += 2;
          break;
        }
        case 'ASK_SUSPECT': {
          this.callFlags.detailsKnown = true;
          this.pushLine('Operador', 'Descreva suspeito e direção de fuga (roupa, altura, veículo).');
          this.pushLine('Chamador', 'Um homem de moletom escuro… correndo para a esquina.');
          this.score += 2;
          break;
        }
        case 'ASK_BREATHING': {
          this.callFlags.detailsKnown = true;
          this.pushLine('Operador', 'Ele está respirando ou reagindo?');
          this.pushLine('Chamador', 'Não… ele não responde!');
          this.score += 1;
          break;
        }
        case 'GIVE_SAFETY': {
          this.callFlags.gaveSafety = true;
          this.pushLine('Operador', 'Mantenha-se em segurança. Se houver risco, se esconda e fique em silêncio. Não confronte.');
          this.score += 3;
          break;
        }
        case 'GIVE_FIRE_SAFETY': {
          this.callFlags.gaveFireSafety = true;
          this.pushLine('Operador', 'Evacue se puder com segurança. NÃO use elevador. Feche portas ao sair e mantenha-se abaixo da fumaça.');
          this.score += 3;
          break;
        }
        case 'GIVE_SAFETY_ONLY': {
          this.callFlags.gaveSafety = true;
          this.pushLine('Operador', 'Afaste curiosos e sinalize o local. Não tente mover vítimas presas.');
          this.score += 2;
          break;
        }
        case 'GIVE_CPR': {
          this.callFlags.gaveCPR = true;
          this.pushLine('Operador', 'Vamos iniciar RCP. Coloque as mãos no centro do peito e faça compressões fortes e rápidas.');
          this.pushLine('Operador', 'Conte comigo: 1, 2, 3... mantenha o ritmo até a ambulância chegar.');
          this.score += 4;
          break;
        }
        case 'SUGGEST_REPORT': {
          // Mild call: suggestion can be correct if low priority
          if (t.severity === 'low' || t.severity === 'prank') {
            this.pushLine('Operador', 'Entendi. Para situações sem risco imediato, você pode registrar ocorrência e solicitar orientação pelo canal adequado.');
            this.score += 3;
            this.endCurrentCall({ counted: true, reason: 'redirected' });
          } else {
            this.pushLine('Sistema', 'Isso pode ser insuficiente para este tipo de ocorrência.', { tone: 'system' });
            this.score -= 2;
          }
          break;
        }
        case 'MARK_PRANK': {
          this.callFlags.markedPrank = true;
          if (t.severity === 'prank') {
            this.pushLine('Operador', 'Entendi. Esta ligação parece não ser emergência real. Encerrando atendimento.');
            this.score += 6;
            this.endCurrentCall({ counted: true, reason: 'prank_ok' });
          } else {
            this.pushLine('Sistema', 'Atenção: você pode ter encerrado uma ocorrência real.', { tone: 'system' });
            this.score -= 8;
            // Create incident anyway (missed)
            const inc = this.ensureIncidentExists({ allowUnknownLocation: true });
            if (inc) inc.notes.push('Possível encerramento indevido pelo operador.');
            this.endCurrentCall({ counted: true, reason: 'prank_wrong' });
          }
          break;
        }
        case 'CALM': {
          this.pushLine('Operador', 'Respire. Você fez certo em ligar. Vamos resolver juntos.');
          this.score += 2;
          break;
        }
        case 'OPEN_DISPATCH': {
          // Ensure incident exists
          const inc = this.ensureIncidentExists({ allowUnknownLocation: true });
          if (inc) {
            this.pushLine('Sistema', `Incidente registrado no CAD: #${inc.shortId} (${inc.code}).`, { tone: 'system' });
            this.selectIncident(inc.id);
            // Suggest dispatch
            this.openDispatchPanel();
          }
          break;
        }
        default:
          this.pushLine('Sistema', 'Ação não implementada.', { tone: 'system' });
          break;
      }

      this.updateHUD();
      this.renderAll();
    }

    ensureIncidentExists({ allowUnknownLocation }) {
      const call = this.currentCall;
      if (!call) return null;

      if (call.incidentId) {
        return this.incidents.find(i => i.id === call.incidentId) || null;
      }

      // Determine location
      let x = randInt(0, GRID_SIZE - 1);
      let y = randInt(0, GRID_SIZE - 1);

      // If location is known, pick a more stable point; else keep random but note "aprox."
      if (!allowUnknownLocation && !this.callFlags.locationKnown) {
        return null;
      }

      // Avoid stacking too much
      const used = new Set(this.incidents.filter(i => !i.closed).map(i => `${i.x},${i.y}`));
      let tries = 0;
      while (used.has(`${x},${y}`) && tries < 25) {
        x = randInt(0, GRID_SIZE - 1);
        y = randInt(0, GRID_SIZE - 1);
        tries++;
      }

      const t = call.template;

      const inc = {
        id: `inc_${nowMs()}_${Math.random().toString(16).slice(2)}`,
        shortId: String(this.incidents.length + 1).padStart(2, '0'),
        category: t.category,
        code: t.code,
        priority: t.basePriority,
        status: 'registered',
        statusLabel: 'Registrada',
        x, y,
        requiredTags: [...t.requiredTags],
        optionalTags: [...t.optionalTags],
        notes: [],
        assignedUnitIds: [],
        createdAt: nowMs(),
        closed: false,

        // outcome tracking
        callQuality: 0, // + for good instructions
        firstDispatchAt: 0,
      };

      // Notes from call actions already done
      if (this.callFlags.gaveCPR) inc.callQuality += 2;
      if (this.callFlags.gaveFireSafety) inc.callQuality += 1;
      if (this.callFlags.gaveSafety) inc.callQuality += 1;
      if (this.callFlags.locationKnown) inc.notes.push('Local confirmado pelo chamador.');
      else inc.notes.push('Local aproximado (necessita confirmação).');

      this.incidents.push(inc);
      call.incidentId = inc.id;

      this.logCAD(`Novo incidente #${inc.shortId} registrado: ${inc.code} (P${inc.priority}).`);
      this.audio.ok();

      this.renderAll();
      return inc;
    }

    endCurrentCall({ counted, reason }) {
      const call = this.currentCall;
      if (!call) return;

      clearInterval(this.intervals.callTimer);
      this.intervals.callTimer = null;

      // Wrap up scoring based on call handling
      if (counted) this.callsHandled += 1;

      if (reason === 'redirected') {
        this.logCAD('Ligação encerrada com orientação (canal adequado).');
      } else if (reason === 'prank_ok') {
        this.logCAD('Trote identificado corretamente.');
      } else if (reason === 'timeout') {
        this.logCAD('Ligação encerrada por tempo excedido.');
      } else if (reason === 'manual_end') {
        this.logCAD('Ligação encerrada manualmente.');
      }

      // Bonus if location known early
      if (this.callFlags.locationKnown) this.score += 1;

      // Mark incident call quality
      const inc = call.incidentId ? this.incidents.find(i => i.id === call.incidentId) : null;
      if (inc) {
        if (this.callFlags.gaveCPR) inc.callQuality += 2;
        if (this.callFlags.gaveFireSafety) inc.callQuality += 1;
        if (this.callFlags.gaveSafety) inc.callQuality += 1;
        if (this.callFlags.markedPrank && inc.priority <= 2) inc.notes.push('Operador suspeitou de trote.');
      }

      this.currentCall = null;
      this.resetCall();
      this.updateHUD();
      this.renderAll();
    }

    /* -------------------------- Simulation Tick ----------------------- */

    tickUnits() {
      for (const u of this.units) {
        if (u.status === 'enroute' && u.target) {
          const target = u.target;

          // Move u.speed steps toward target per tick
          for (let step = 0; step < u.speed; step++) {
            if (u.x === target.x && u.y === target.y) break;
            if (u.x < target.x) u.x++;
            else if (u.x > target.x) u.x--;
            else if (u.y < target.y) u.y++;
            else if (u.y > target.y) u.y--;
          }

          // Recompute ETA (rough)
          u.eta = manhattan(u, { x: target.x, y: target.y });

          if (u.x === target.x && u.y === target.y) {
            u.status = 'onscene';
            u.resolveAt = nowMs() + this.resolveTimeMsForUnit(u, target.incidentId);
            this.logCAD(`${u.id} chegou no local do incidente.`);
            this.audio.ok();

            // update incident state
            const inc = this.incidents.find(i => i.id === target.incidentId);
            if (inc && !inc.closed) {
              if (!inc.firstDispatchAt) inc.firstDispatchAt = nowMs();
              inc.status = 'onscene';
              inc.statusLabel = 'No local';
            }
          } else {
            // Update incident to enroute
            const inc = this.incidents.find(i => i.id === target.incidentId);
            if (inc && !inc.closed) {
              if (!inc.firstDispatchAt) inc.firstDispatchAt = nowMs();
              inc.status = 'enroute';
              inc.statusLabel = 'Em rota';
            }
          }
        } else if (u.status === 'onscene') {
          if (u.resolveAt && nowMs() >= u.resolveAt) {
            // Resolve action completed, unit returns
            u.status = 'returning';
            u.target = null;
            u.resolveAt = 0;
            // Return toward center
            u.target = { x: this.city.defaultCenter.x, y: this.city.defaultCenter.y, incidentId: null };
          }
        } else if (u.status === 'returning' && u.target) {
          const target = u.target;
          for (let step = 0; step < u.speed; step++) {
            if (u.x === target.x && u.y === target.y) break;
            if (u.x < target.x) u.x++;
            else if (u.x > target.x) u.x--;
            else if (u.y < target.y) u.y++;
            else if (u.y > target.y) u.y--;
          }
          if (u.x === target.x && u.y === target.y) {
            u.status = 'available';
            u.target = null;
            this.logCAD(`${u.id} disponível novamente.`);
          }
        }
      }
    }

    resolveTimeMsForUnit(unit, incidentId) {
      const inc = this.incidents.find(i => i.id === incidentId);
      // Base time: higher priority = longer but more urgent; we keep moderate.
      let base = inc ? (inc.priority === 0 ? 8500 : inc.priority === 1 ? 7000 : inc.priority === 2 ? 6000 : 5200) : 6000;

      // Faster if tactical/air in police high risk
      if (unit.tags.includes('air')) base *= 0.75;
      if (unit.tags.includes('tactical')) base *= 0.9;

      return Math.round(base);
    }

    tickIncidents() {
      // An incident closes when:
      // - It has at least one unit on scene AND all assigned units have completed "onscene" at least once
      // - Or after some time with no response (failure)
      for (const inc of this.incidents) {
        if (inc.closed) continue;

        // If no units assigned and too old, penalize
        const ageSec = (nowMs() - inc.createdAt) / 1000;
        if (!inc.assignedUnitIds.length && ageSec > 55) {
          inc.notes.push('Sem despacho por muito tempo. Possível agravamento.');
          inc.priority = clamp(inc.priority - 1, 0, 3);
          this.score -= 3;
          this.logCAD(`Incidente #${inc.shortId} agravou por falta de despacho.`);
        }

        // Determine if all assigned units are no longer onscene/enroute to this incident (meaning completed)
        if (inc.assignedUnitIds.length) {
          const related = this.units.filter(u => inc.assignedUnitIds.includes(u.id));
          const anyEnrouteOrOnscene = related.some(u => (u.status === 'enroute' || u.status === 'onscene') && u.target && u.target.incidentId === inc.id);

          // If no longer active and at least one arrived in past, we resolve.
          const arrivedAny = related.some(u => u.status !== 'available'); // rough, but ok for prototype
          if (!anyEnrouteOrOnscene && arrivedAny && inc.status !== 'closed') {
            this.resolveIncidentOutcome(inc);
          }
        }
      }
    }

    resolveIncidentOutcome(inc) {
      // Compute outcome score:
      // - Response time (firstDispatchAt - createdAt)
      // - Required tags fulfilled by assigned units
      // - Call quality (CPR / safety instructions)
      const assignedUnits = inc.assignedUnitIds.map(id => this.units.find(u => u.id === id)).filter(Boolean);
      const tags = new Set(assignedUnits.flatMap(u => u.tags));

      const requiredMet = inc.requiredTags.filter(t => tags.has(t)).length;
      const requiredTotal = inc.requiredTags.length || 1; // avoid 0 division

      const responseSec = inc.firstDispatchAt ? (inc.firstDispatchAt - inc.createdAt) / 1000 : 999;
      const responseFactor = clamp(1 - (responseSec / (inc.priority === 0 ? 18 : inc.priority === 1 ? 24 : 32)), 0, 1);

      const reqFactor = clamp(requiredMet / requiredTotal, 0, 1);
      const callFactor = clamp((inc.callQuality + 1) / 4, 0.25, 1);

      // Base success by priority and severity
      let base = inc.priority === 0 ? 0.55 : inc.priority === 1 ? 0.65 : inc.priority === 2 ? 0.75 : 0.82;
      // If prank / false, success is just "handled"
      if (inc.code.toLowerCase().includes('trote')) base = 0.90;

      const successProb = clamp(base * (0.55 + 0.25 * responseFactor + 0.20 * reqFactor) * (0.85 + 0.15 * callFactor), 0.02, 0.98);
      const success = chance(successProb);

      inc.closed = true;
      inc.status = 'closed';
      inc.statusLabel = 'Encerrada';

      // Score + narrative
      const ptsBase = inc.priority === 0 ? 18 : inc.priority === 1 ? 12 : inc.priority === 2 ? 8 : 5;

      if (success) {
        const pts = Math.round(ptsBase * (0.6 + 0.4 * responseFactor) * (0.7 + 0.3 * reqFactor));
        this.score += pts;
        this.callsHandled += 1;

        const msg = this.makeSuccessNarrative(inc, tags);
        this.logCAD(`✅ Incidente #${inc.shortId} resolvido: +${pts} pts. ${msg}`);
        this.audio.ok();
      } else {
        const penalty = Math.round(ptsBase * 0.9 * (DIFFICULTY[this.difficulty]?.penaltyMultiplier || 1));
        this.score -= penalty;
        this.callsHandled += 1;

        const msg = this.makeFailureNarrative(inc, tags);
        this.logCAD(`❌ Incidente #${inc.shortId} falhou: -${penalty} pts. ${msg}`);
        this.audio.warn();
      }

      if (this.activeIncidentId === inc.id) this.activeIncidentId = null;
      this.updateHUD();
      this.renderAll();
    }

    makeSuccessNarrative(inc, tags) {
      if (inc.code.includes('Parada')) {
        return (tags.has('ems-basic') ? 'Vítima estabilizada com suporte inicial.' : 'Vítima estabilizada com dificuldade.');
      }
      if (inc.code.includes('Incêndio')) {
        return (tags.has('engine') ? 'Fogo controlado e área isolada.' : 'Fogo controlado com atraso.');
      }
      if (inc.code.includes('Roubo')) {
        return (tags.has('tactical') ? 'Suspeito contido sem feridos.' : 'Suspeito fugiu, mas vítimas protegidas.');
      }
      if (inc.code.includes('Acidente')) {
        return (tags.has('rescue') ? 'Vítima retirada com segurança.' : 'Vítima liberada com apoio limitado.');
      }
      if (inc.code.toLowerCase().includes('trote')) return 'Ligação improcedente encerrada sem mobilizar recursos.';
      return 'Ocorrência encerrada com sucesso.';
    }

    makeFailureNarrative(inc, tags) {
      if (inc.code.includes('Parada')) {
        return 'A vítima não resistiu devido ao atraso/protocolo inadequado.';
      }
      if (inc.code.includes('Incêndio')) {
        return 'O fogo se espalhou e houve grandes danos.';
      }
      if (inc.code.includes('Roubo')) {
        return 'O suspeito escapou e houve risco elevado no local.';
      }
      if (inc.code.includes('Acidente')) {
        return 'Demora gerou agravamento das lesões.';
      }
      if (inc.code.toLowerCase().includes('trote')) return 'Recursos foram desperdiçados em chamada falsa.';
      return 'Resultado negativo por decisão/tempo.';
    }

    /* ------------------------------ UI ------------------------------- */

    updateHUD() {
      this.el.shiftTimer.textContent = formatTime(this.shiftSeconds);
      this.el.score.textContent = String(this.score);
      this.el.callsHandled.textContent = String(this.callsHandled);

      if (this.currentCall) {
        this.el.callTimer.textContent = formatTime(this.callSecondsLeft);
      } else {
        this.el.callTimer.textContent = '--:--';
      }
    }

    setActiveTab(tab) {
      // On desktop we show all panels; on mobile, hide others
      const isMobile = window.matchMedia('(max-width: 720px)').matches;
      if (!isMobile) {
        this.el.panels.forEach(p => p.dataset.hidden = 'false');
        return;
      }

      this.el.panels.forEach(p => {
        const isTarget = p.dataset.panel === tab;
        p.dataset.hidden = isTarget ? 'false' : 'true';
      });
    }

    renderAll() {
      this.updateHUD();
      this.renderMap();
      this.renderUnits();
      this.renderCAD();
    }
  }

  /* --------------------------- Boot --------------------------- */

  window.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line no-new
    new Game();
  });
})();