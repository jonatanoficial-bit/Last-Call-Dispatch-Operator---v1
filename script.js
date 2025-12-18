/*
 * Last Call Dispatch Operator – simplified prototype
 *
 * This script implements a playable prototype for an emergency dispatch simulator.
 * The game cycles through a set of scripted calls, allowing the player to choose
 * the appropriate response and dispatch available units on a small grid map.
 *
 * The focus is on demonstrating the core loop: handling a call, creating an
 * incident at a location, dispatching the correct service, moving a unit to
 * the location, resolving the incident, and scoring the result. This provides
 * a foundation for future expansion into a full AAA game, with modular
 * components and clean separation of state, logic and presentation.
 */

// Game configuration
const GRID_SIZE = 10; // 10x10 city grid

// Define call scenarios. Each call defines a message, the required
// responses and the type of service needed. Coordinates specify where the
// incident will appear on the grid (x = column index, y = row index).
const callsData = [
  {
    id: 1,
    region: 'Brazil',
    type: 'fire',
    message:
      'Caller: Há fogo na minha cozinha! Começou no fogão e está se espalhando. Estou na Rua das Flores, número 15.',
    options: ['Enviar Bombeiros', 'Enviar Polícia', 'Enviar Ambulância', 'Encerrar Chamada'],
    correct: 'Enviar Bombeiros',
    x: 2,
    y: 5,
    instructions:
      'Instrua o chamador a evacuar imediatamente, fechar portas para conter o fogo e aguardar os bombeiros do lado de fora.',
  },
  {
    id: 2,
    region: 'USA',
    type: 'police',
    message:
      'Caller: I just witnessed a robbery! The suspect is running toward the park at Oak Street. Please send help!',
    options: ['Send Police', 'Send Fire Department', 'Send Ambulance', 'Dismiss Call'],
    correct: 'Send Police',
    x: 8,
    y: 3,
    instructions:
      'Advise the caller to stay safe and provide any details of the suspect without pursuing them.',
  },
  {
    id: 3,
    region: 'Europe',
    type: 'medical',
    message:
      'Caller: My father collapsed and is not breathing! We are at Avenue de la Liberté, number 28. He needs help!',
    options: ['Send Ambulance', 'Send Police', 'Send Fire Department', 'Provide CPR Instructions'],
    // For medical calls we require the player to both dispatch an ambulance and provide CPR instructions.
    correct: 'Send Ambulance',
    bonus: 'Provide CPR Instructions',
    x: 4,
    y: 7,
    instructions:
      'Guide the caller through CPR: place hands in the center of the chest, push hard and fast at 100–120 compressions per minute.',
  },
  {
    id: 4,
    region: 'Brazil',
    type: 'false',
    message:
      'Caller: Eu vi um OVNI pousando no meu quintal! Pode ser uma invasão alienígena!',
    options: ['Enviar Polícia', 'Enviar Bombeiros', 'Encerrar Chamada'],
    correct: 'Encerrar Chamada',
    x: null,
    y: null,
    instructions: 'Esta chamada não é uma emergência real. Informe ao chamador sobre o uso correto do serviço 190/193.',
  },
];

// Define unit types and initial positions. In a real game these would be loaded
// from data files and could be upgraded or customized. Units have unique IDs
// and track their location, status and assignment.
const unitDefinitions = [
  { id: 'P1', type: 'police', x: 9, y: 0 },
  { id: 'P2', type: 'police', x: 9, y: 2 },
  { id: 'F1', type: 'fire', x: 9, y: 4 },
  { id: 'F2', type: 'fire', x: 9, y: 6 },
  { id: 'M1', type: 'medical', x: 9, y: 8 },
  { id: 'M2', type: 'medical', x: 9, y: 9 },
];

// Utility to format time into MM:SS
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Main Game class encapsulating state and behaviour
class Game {
  constructor() {
    this.timerElement = document.getElementById('timer');
    this.startButton = document.getElementById('start-btn');
    this.restartButton = document.getElementById('restart-btn');
    this.callDialogue = document.getElementById('call-dialogue');
    this.callOptions = document.getElementById('call-options');
    this.mapGrid = document.getElementById('map-grid');
    this.unitsListEl = document.getElementById('units-list');
    this.scoreEl = document.getElementById('score');
    this.callsHandledEl = document.getElementById('calls-handled');
    this.mainEl = document.getElementById('main');
    this.resultSection = document.getElementById('result-section');
    this.resultText = document.getElementById('result-text');

    this.units = [];
    this.incidents = [];
    this.currentCallIndex = 0;
    this.score = 0;
    this.callsHandled = 0;
    this.timeElapsed = 0;
    this.timerInterval = null;
    this.movingIntervals = {};

    this.handleStart = this.startGame.bind(this);
    this.handleRestart = this.restartGame.bind(this);
    this.startButton.addEventListener('click', this.handleStart);
    this.restartButton.addEventListener('click', this.handleRestart);
  }

  // Initialize or reset the game state
  init() {
    // Reset state
    this.units = unitDefinitions.map(u => ({ ...u, status: 'available', assignedIncident: null }));
    this.incidents = [];
    this.currentCallIndex = 0;
    this.score = 0;
    this.callsHandled = 0;
    this.timeElapsed = 0;
    this.clearIntervals();
    // Clear grid and results
    this.mapGrid.innerHTML = '';
    this.callDialogue.innerHTML = '';
    this.callOptions.innerHTML = '';
    this.resultSection.classList.add('hidden');
    this.mainEl.classList.remove('hidden');
    // Build grid cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.dataset.row = row;
        cell.dataset.col = col;
        this.mapGrid.appendChild(cell);
      }
    }
    // Render units and scoreboard
    this.renderUnits();
    this.updateScoreboard();
    this.updateTimerDisplay();
  }

  // Start the game and timer
  startGame() {
    this.startButton.disabled = true;
    this.init();
    this.spawnNextCall();
    this.timerInterval = setInterval(() => {
      this.timeElapsed++;
      this.updateTimerDisplay();
    }, 1000);
  }

  // Restart after game over
  restartGame() {
    this.init();
    this.startButton.disabled = false;
    this.resultSection.classList.add('hidden');
  }

  // Clear any ongoing unit movement intervals
  clearIntervals() {
    for (const key in this.movingIntervals) {
      clearInterval(this.movingIntervals[key]);
    }
    this.movingIntervals = {};
    clearInterval(this.timerInterval);
  }

  // Update timer display
  updateTimerDisplay() {
    this.timerElement.textContent = `Time: ${formatTime(this.timeElapsed)}`;
  }

  // Spawn the next call. If no more calls left, end the game.
  spawnNextCall() {
    if (this.currentCallIndex >= callsData.length) {
      this.endGame();
      return;
    }
    // Get call data
    const call = callsData[this.currentCallIndex];
    this.showMessage(call.message);
    this.buildOptions(call);
  }

  // Display a message in the call dialogue with a typewriter effect
  showMessage(text) {
    this.callDialogue.innerHTML = '';
    const p = document.createElement('p');
    this.callDialogue.appendChild(p);
    let index = 0;
    const interval = setInterval(() => {
      p.textContent += text.charAt(index);
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 20);
  }

  // Build option buttons for the current call
  buildOptions(call) {
    this.callOptions.innerHTML = '';
    call.options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.addEventListener('click', () => this.handleOptionSelect(call, option));
      this.callOptions.appendChild(btn);
    });
  }

  // Handle an option selection
  handleOptionSelect(call, selection) {
    // Clear options to prevent multiple clicks
    this.callOptions.innerHTML = '';
    const messages = [];
    let correct = false;
    let bonus = false;
    if (selection === call.correct) {
      correct = true;
      messages.push('Você selecionou a opção correta.');
    } else {
      messages.push('Opção inadequada. Isso pode atrasar o atendimento.');
    }
    if (call.type === 'medical' && selection === call.bonus) {
      bonus = true;
      messages.push('Você forneceu instruções de RCP corretamente.');
    }
    // Show instructions if available
    if (correct || bonus) {
      messages.push(`Instrução: ${call.instructions}`);
    }
    // Append messages to call dialogue
    messages.forEach(msg => {
      const p = document.createElement('p');
      p.textContent = msg;
      this.callDialogue.appendChild(p);
    });
    // Process false calls separately
    if (call.type === 'false') {
      if (selection === call.correct) {
        this.score += 10; // small reward for dismissing a false alarm
      } else {
        this.score -= 5;
      }
      this.callsHandled++;
      this.updateScoreboard();
      this.currentCallIndex++;
      // Wait briefly then spawn next call
      setTimeout(() => this.spawnNextCall(), 2000);
      return;
    }
    // For real calls, create an incident regardless of correctness
    const incident = {
      id: `inc${Date.now()}`,
      type: call.type,
      x: call.x,
      y: call.y,
      resolved: false,
    };
    this.incidents.push(incident);
    this.renderIncident(incident);
    // Update score: reward for correct, penalty for wrong selection
    if (correct) this.score += 20; else this.score -= 10;
    if (bonus) this.score += 10;
    this.updateScoreboard();
    this.callsHandled++;
    this.currentCallIndex++;
    // Give the player time to dispatch: display available units with dispatch buttons
    this.showDispatchOptions(incident);
  }

  // Render an incident marker on the grid
  renderIncident(incident) {
    const index = incident.y * GRID_SIZE + incident.x;
    const cell = this.mapGrid.children[index];
    const marker = document.createElement('div');
    marker.classList.add('incident');
    marker.dataset.incidentId = incident.id;
    cell.appendChild(marker);
  }

  // Render units on the grid and in the list
  renderUnits() {
    // Clear any existing unit markers
    this.mapGrid.querySelectorAll('.unit').forEach(u => u.remove());
    this.unitsListEl.innerHTML = '';
    // Render units on map
    this.units.forEach(unit => {
      const index = unit.y * GRID_SIZE + unit.x;
      const cell = this.mapGrid.children[index];
      const marker = document.createElement('div');
      marker.classList.add('unit', unit.type);
      marker.dataset.unitId = unit.id;
      cell.appendChild(marker);
      // Render unit in list
      const item = document.createElement('div');
      item.classList.add('unit-item');
      const label = document.createElement('span');
      label.textContent = `${unit.id.toUpperCase()} (${unit.type}) - [${unit.x},${unit.y}]`;
      const btn = document.createElement('button');
      btn.textContent = 'Dispatch';
      // Only enable button for available units
      btn.disabled = unit.status !== 'available';
      btn.addEventListener('click', () => this.prepareDispatch(unit));
      item.appendChild(label);
      item.appendChild(btn);
      this.unitsListEl.appendChild(item);
    });
  }

  // Show dispatch options: highlight units of correct type and ask the player to choose
  showDispatchOptions(incident) {
    // Inform the player
    const info = document.createElement('p');
    info.textContent = 'Selecione uma unidade para despachar para a ocorrência.';
    this.callDialogue.appendChild(info);
    // Re-render units list with dispatch buttons enabled only for matching type
    this.renderUnits();
    // Highlight the units that match incident type
    this.unitsListEl.querySelectorAll('.unit-item').forEach(item => {
      const unitId = item.querySelector('span').textContent.split(' ')[0];
      const unit = this.units.find(u => u.id.toUpperCase() === unitId);
      const btn = item.querySelector('button');
      if (unit && unit.type === incident.type) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    });
    // Save current incident for dispatch
    this.pendingIncident = incident;
  }

  // Prepare to dispatch a unit to the pending incident
  prepareDispatch(unit) {
    const incident = this.pendingIncident;
    if (!incident || incident.resolved) return;
    // Set unit as busy
    unit.status = 'moving';
    unit.assignedIncident = incident.id;
    this.renderUnits();
    // Calculate path: simple Manhattan path
    const path = this.calculatePath(unit.x, unit.y, incident.x, incident.y);
    this.moveUnitAlongPath(unit, path, () => {
      this.resolveIncident(incident, unit);
    });
    // Clear pending incident
    this.pendingIncident = null;
  }

  // Manhattan path generation: returns array of {x,y} steps
  calculatePath(x1, y1, x2, y2) {
    const path = [];
    let cx = x1;
    let cy = y1;
    while (cx !== x2 || cy !== y2) {
      if (cx < x2) cx++;
      else if (cx > x2) cx--;
      else if (cy < y2) cy++;
      else if (cy > y2) cy--;
      path.push({ x: cx, y: cy });
    }
    return path;
  }

  // Move a unit along a path with animation
  moveUnitAlongPath(unit, path, onComplete) {
    let step = 0;
    const intervalId = setInterval(() => {
      if (step >= path.length) {
        clearInterval(intervalId);
        delete this.movingIntervals[unit.id];
        onComplete();
        return;
      }
      // Update position
      const { x, y } = path[step];
      unit.x = x;
      unit.y = y;
      this.renderUnits();
      step++;
    }, 400);
    this.movingIntervals[unit.id] = intervalId;
  }

  // Resolve an incident when a unit arrives
  resolveIncident(incident, unit) {
    incident.resolved = true;
    unit.status = 'available';
    unit.assignedIncident = null;
    // Remove incident marker
    const marker = this.mapGrid.querySelector(`.incident[data-incident-id="${incident.id}"]`);
    if (marker) marker.remove();
    // Award points for resolution
    this.score += 30;
    this.updateScoreboard();
    // Notify player
    const p = document.createElement('p');
    p.textContent = 'Ocorrência resolvida com sucesso!';
    this.callDialogue.appendChild(p);
    // Spawn next call after short delay
    setTimeout(() => this.spawnNextCall(), 2000);
  }

  // Update scoreboard display
  updateScoreboard() {
    this.scoreEl.textContent = `Score: ${this.score}`;
    this.callsHandledEl.textContent = `Calls handled: ${this.callsHandled}`;
  }

  // End the game and show result
  endGame() {
    this.clearIntervals();
    this.mainEl.classList.add('hidden');
    this.resultSection.classList.remove('hidden');
    this.resultText.textContent = `Você atendeu ${this.callsHandled} chamadas e obteve ${this.score} pontos.`;
  }
}

// Instantiate game on page load
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
});