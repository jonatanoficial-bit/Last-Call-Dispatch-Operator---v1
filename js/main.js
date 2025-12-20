import { GameState } from './gameState.js';
import { UIManager } from './uiManager.js';
import { AudioManager } from './audioManager.js';
import { DispatchManager } from './dispatchManager.js';
import { CallManager } from './callManager.js';

const state = new GameState();
const audio = new AudioManager();
const ui = new UIManager(state, audio);
let dispatch = null;
let calls = null;

let lastT = performance.now();

async function boot(){
  await state.loadContent({ cityId:'nova_aurora' });
  state.resetRun();

  dispatch = new DispatchManager(state, ui, audio);
  calls = new CallManager(state, ui, audio, dispatch);

  ui.bindHandlers({
    onStart: startShift,
    onRestart: restart,
    onPauseToggle: togglePause,
    onHoldActive: ()=>{ if (state.running) { calls.holdActive(false); renderAll(); } },
    onEndActive: ()=>{ if (state.running) { calls.endActive(); renderAll(); } },

    onAnswerSelected: ()=> answerSelected(),

    onUnitSelected: ()=>{ ui.setDispatchEnabled(canDispatchNow()); },
    onDispatch: ()=>doDispatch(),

    getCallOptions: (call, template)=>getCallOptions(call, template),
  });

  dispatch.initGrid();

  renderAll();
  requestAnimationFrame(loop);
}

function startShift(){
  if (state.running) return;
  state.resetRun();
  state.running = true;
  calls.startShift();
  ui.toast('Turno iniciado.');
  renderAll();
}

function restart(){
  state.resetRun();
  ui.toast('Reiniciado.');
  renderAll();
}

function togglePause(){
  if (!state.running) return;
  state.paused = !state.paused;
  if (state.paused) ui.toast('Pausado.');
  else ui.toast('Continuando.');
  renderAll();
}

function answerSelected(){
  const rid = state.selectedQueueCallId;
  if (!rid) return;
  calls.answerCall(rid);
  renderAll();
}

function getActiveTemplate(){
  const call = calls.getActiveCall();
  if (!call) return { call:null, template:null };
  return { call, template: calls.getTemplateById(call.templateId) };
}

function getCallOptions(call, template){
  if (!call || !template) return [];

  // If there is an instruction mini-menu override
  const override = calls.getInstructionOverride(call);
  if (override){
    return override.concat([{ label:'Voltar', onClick:()=>{ delete call._instructionOptions; delete call._instructionPrompt; } }]);
  }

  // Default protocol options
  return calls.getOptions(call);
}

function doDispatch(){
  const result = dispatch.dispatchSelected();
  if (!result.ok){
    ui.toast(result.reason || 'Não foi possível despachar.');
    audio.playError();
    return;
  }

  // When dispatch happens, try to find active/related call and mark waiting
  const incId = result.incident?.id;
  if (incId){
    const call = state.callQueue.find(c=>c.incidentId === incId);
    if (call){
      call.waitingForDispatch = true;
      call.transcript.push(`\n📡 Despacho: Unidade ${result.unit.id} a caminho. ETA estimado: ${estimateEta(result.unit, result.incident)}s`);
    }
  }

  renderAll();
}

function estimateEta(unit, incident){
  const dist = Math.abs(unit.x - incident.x) + Math.abs(unit.y - incident.y);
  const speed = state.config.unitSpeedCellsPerSec;
  return Math.ceil(dist / Math.max(1, speed));
}

function canDispatchNow(){
  return !!(state.selectedIncidentId && state.selectedUnitId);
}

function renderAll(){
  ui.updateHUD();
  ui.renderQueue();
  const { call, template } = getActiveTemplate();
  ui.renderActiveCall(call, template);
  ui.renderUnits();
  ui.renderSelectedIncidentLabel();
  dispatch.renderAllMarkers();
  ui.setDispatchEnabled(canDispatchNow());
}

function loop(t){
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (state.running && !state.paused){
    state.shiftElapsed += dt;

    calls.update(dt);
    dispatch.update(dt);

    // If any incident just resolved, award/close related call
    for (const inc of state.incidents){
      if (inc.status === 'resolved' && !inc._notified){
        inc._notified = true;
        calls.onIncidentResolved({ incident: inc, unit: state.units.find(u=>u.id === inc.assignedUnitId) });
      }
    }

    // End shift
    if (state.shiftElapsed >= state.config.shiftDurationSec){
      endShift();
    }
  }

  // UI refresh: keep timer updates smooth
  renderAll();
  requestAnimationFrame(loop);
}

function endShift(){
  state.running = false;
  state.paused = false;

  // close open calls with small penalty (unfinished)
  let unfinished = 0;
  for (const c of state.callQueue){
    if (c.status !== 'closed'){
      c.status = 'closed';
      unfinished += 1;
    }
  }
  if (unfinished > 0){
    state.addScore(-unfinished * 8);
  }

  ui.showModal(`Score final: ${state.score}. Chamadas pendentes no fim do turno: ${unfinished}.`);
}

boot();
