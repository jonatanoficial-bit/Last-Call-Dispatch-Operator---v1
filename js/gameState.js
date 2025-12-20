import { CITY_NOVA_AURORA, PHASE2_CALLS } from './contentFallback.js';
import { uid } from './util.js';

/**
 * GameState: estado global (pensado para multiplayer futuro).
 * Tudo que define a simulação fica aqui (serializável).
 */
export class GameState{
  constructor(){
    this.config = {
      shiftDurationSec: 6 * 60,           // 6 minutos (Fase 2)
      callSpawnEverySec: 22,              // a cada ~22s, tenta tocar novo
      queueMax: 5,
      unitSpeedCellsPerSec: 6,            // velocidade base
      onHoldPenaltySec: 6,                // penalidade de tempo por alternar/colocar em espera
      missedCallPenalty: { low: 10, medium: 18, high: 28 }
    };

    this.running = false;
    this.paused = false;

    this.city = null;
    this.callsData = [];
    this.score = 0;
    this.shiftElapsed = 0;

    // Calls runtime
    this.callQueue = [];     // { rid, templateId, status: 'ringing'|'active'|'hold'|'closed', timeLeft, openedAtSec, ... }
    this.activeCallId = null;
    this.selectedQueueCallId = null;

    // Dispatch
    this.units = [];
    this.incidents = [];
    this.selectedIncidentId = null;
    this.selectedUnitId = null;
  }

  async loadContent({ cityId='nova_aurora' } = {}){
    try{
      const cityRes = await fetch(`data/cities/${cityId}.json`, { cache: 'no-store' });
      if (!cityRes.ok) throw new Error('Falha ao carregar cidade');
      this.city = await cityRes.json();

      const callsRes = await fetch(`data/calls/phase2_calls.json`, { cache: 'no-store' });
      if (!callsRes.ok) throw new Error('Falha ao carregar calls');
      const payload = await callsRes.json();
      this.callsData = payload.calls ?? [];
    }catch(e){
      console.warn('[GameState] fetch falhou; usando fallback embutido.', e);
      if (cityId !== 'nova_aurora') throw e;
      this.city = CITY_NOVA_AURORA;
      this.callsData = PHASE2_CALLS.calls;
    }
  }

  resetRun(){
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.shiftElapsed = 0;

    this.callQueue = [];
    this.activeCallId = null;
    this.selectedQueueCallId = null;

    this.incidents = [];
    this.selectedIncidentId = null;
    this.selectedUnitId = null;

    this._initUnits();
  }

  _initUnits(){
    // Unidades iniciais (Fase 2): 2 polícia, 2 bombeiros, 1 médico.
    const baseByType = {};
    for (const b of this.city.bases) baseByType[b.type] = b;

    this.units = [
      { id:'P1', type:'police', x:baseByType.police.x, y:baseByType.police.y, status:'idle', target:null },
      { id:'P2', type:'police', x:baseByType.police.x, y:baseByType.police.y, status:'idle', target:null },
      { id:'F1', type:'fire',   x:baseByType.fire.x,   y:baseByType.fire.y,   status:'idle', target:null },
      { id:'F2', type:'fire',   x:baseByType.fire.x,   y:baseByType.fire.y,   status:'idle', target:null },
      { id:'M1', type:'medical',x:baseByType.medical.x,y:baseByType.medical.y,status:'idle', target:null },
    ];
  }

  addScore(delta){
    this.score = Math.max(-9999, this.score + delta);
  }

  makeRuntimeCall(template){
    const rid = uid('call');
    const sev = template.severity || 'low';
    const timeLimit = template.timeLimitSec ?? 120;
    return {
      rid,
      templateId: template.id,
      status: 'ringing', // ringing | active | hold | closed
      severity: sev,
      timeLeft: timeLimit,
      timeLimit,
      openedAtSec: this.shiftElapsed,

      // protocol state
      routingNeeded: !!template.protocol?.routing,
      serviceHint: template.serviceHint || 'any',
      serviceSelected: null, // 'police'|'fire'|'medical' or null

      addressKnown: false,
      detailsKnown: false,
      injuriesKnown: false,

      factAddress: '—',
      factDetails: '—',
      factInjuries: '—',

      // for scoring + report
      prank: !!template.protocol?.prank,
      instructionDone: false,
      instructionCorrect: null,

      // dispatch linkage
      incidentId: null,
      waitingForDispatch: false,

      // transcript (plain string array)
      transcript: [],
      // event timing
      _elapsed: 0,
      _eventsFired: new Set(),
    };
  }
}
