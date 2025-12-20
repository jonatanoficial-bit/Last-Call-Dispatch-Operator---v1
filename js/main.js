import { GameState } from './gameState.js';
import { loadCity, loadCalls } from './contentLoader.js';
import { UIManager } from './uiManager.js';
import { AudioManager } from './audioManager.js';
import { DispatchManager } from './dispatchManager.js';
import { CallManager } from './callManager.js';

// polyfill for roundRect (older browsers)
if (CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    this.beginPath();
    this.moveTo(x+rr, y);
    this.arcTo(x+w, y, x+w, y+h, rr);
    this.arcTo(x+w, y+h, x, y+h, rr);
    this.arcTo(x, y+h, x, y, rr);
    this.arcTo(x, y, x+w, y, rr);
    this.closePath();
    return this;
  };
}

const state = new GameState();
const audio = new AudioManager();
const ui = new UIManager(state, audio);
const dispatch = new DispatchManager(state, ui, audio);
const calls = new CallManager(state, ui, audio, dispatch);

async function init(){
  state.setCity(await loadCity('nova_aurora'));
  const callData = await loadCalls();
  calls.setTemplates(callData.calls);

  dispatch.initUnits();
  ui.renderTop();
  ui.renderQueue();
  ui.renderUnitDock(state.units, (unitId) => dispatch.dispatchUnit(unitId));
  ui.renderIncidentBadge(null);
  dispatch.render();

  ui.bindHandlers({
    onTogglePause(){
      if (!state.turnRunning) return;
      state.paused = !state.paused;
      ui.renderTop();
    },
    onStart(){
      if (state.turnRunning) return;
      state.turnRunning = true;
      state.paused = false;
      state.turnRemaining = state.turnSec;
      state.score = 0;
      state.queue = [];
      state.activeCall = null;
      state.selectedCallId = null;
      state.incidents = [];
      dispatch.initUnits();
      ui.clearActiveCall();
      ui.renderQueue();
      ui.renderUnitDock(state.units, (unitId) => dispatch.dispatchUnit(unitId));
      ui.setHint('Turno iniciado. Atenda a fila e despache corretamente.');
      calls.startTurn();
      ui.renderTop();
    },
    onReset(){
      state.reset();
      init();
    },
    onAnswerSelected(){
      calls.answerSelected();
    },
    onHold(){
      calls.holdActive();
    },
    onEndCall(){
      calls.endActiveCall(false);
    }
  });

  // main loop
  let last = performance.now();
  function frame(t){
    const dt = Math.min(0.05, (t - last)/1000);
    last = t;

    // update
    calls.tick(dt);
    dispatch.tick(dt);

    // top HUD
    ui.renderTop();
    ui.renderUnitDock(state.units, (unitId) => dispatch.dispatchUnit(unitId));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();
