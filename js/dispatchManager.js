import { clamp, uid } from './util.js';

function expectedUnitTypeFromIncident(incidentType){
  if (incidentType === 'police') return 'police';
  if (incidentType === 'medical') return 'medical';
  // fire/rescue
  return 'fire';
}

export class DispatchManager{
  constructor(state, ui, audio){
    this.state = state;
    this.ui = ui;
    this.audio = audio;

    this._gridW = 18;
    this._gridH = 12;
    this._cells = [];
    this._unitTimers = new Map();
  }

  initGrid(){
    this._gridW = this.state.city.grid.w;
    this._gridH = this.state.city.grid.h;

    const grid = this.ui.els.gridMap;
    grid.style.gridTemplateColumns = `repeat(${this._gridW}, 1fr)`;

    grid.innerHTML = '';
    this._cells = [];
    for (let y=0; y<this._gridH; y++){
      for (let x=0; x<this._gridW; x++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.addEventListener('click', ()=>{
          const inc = this._incidentAt(x,y);
          if (inc){
            this.state.selectedIncidentId = inc.id;
            this.ui.renderSelectedIncidentLabel();
            this.renderAllMarkers();
            this.ui.setDispatchEnabled(this._canDispatch());
          }
        });
        grid.appendChild(cell);
        this._cells.push(cell);
      }
    }

    this.renderAllMarkers();
    this.ui.renderUnits();
  }

  _idx(x,y){ return y*this._gridW + x; }

  _incidentAt(x,y){
    return this.state.incidents.find(i => i.x===x && i.y===y && i.status !== 'resolved');
  }

  renderAllMarkers(){
    // clear styles/markers
    for (const cell of this._cells){
      cell.classList.remove('selected','incidentCell','baseCell');
      cell.innerHTML = '';
    }

    // bases
    for (const b of this.state.city.bases){
      const cell = this._cells[this._idx(b.x, b.y)];
      cell.classList.add('baseCell');
      const m = document.createElement('div');
      m.className = 'marker base';
      m.textContent = b.type === 'police' ? '⌁' : b.type === 'fire' ? '⌂' : '✚';
      cell.appendChild(m);
    }

    // incidents
    for (const inc of this.state.incidents){
      if (inc.status === 'resolved') continue;
      const cell = this._cells[this._idx(inc.x, inc.y)];
      cell.classList.add('incidentCell');
      const m = document.createElement('div');
      m.className = 'marker incident';
      m.textContent = '!';
      cell.appendChild(m);
    }

    // units
    for (const u of this.state.units){
      const cell = this._cells[this._idx(u.x, u.y)];
      const m = document.createElement('div');
      m.className = 'marker unit';
      m.textContent = u.id;
      cell.appendChild(m);
    }

    // selected incident highlight
    if (this.state.selectedIncidentId){
      const inc = this.state.incidents.find(i=>i.id === this.state.selectedIncidentId);
      if (inc && inc.status !== 'resolved'){
        const cell = this._cells[this._idx(inc.x, inc.y)];
        cell.classList.add('selected');
      }
    }
  }

  _canDispatch(){
    const incId = this.state.selectedIncidentId;
    const unitId = this.state.selectedUnitId;
    if (!incId || !unitId) return false;
    const inc = this.state.incidents.find(i=>i.id === incId);
    const unit = this.state.units.find(u=>u.id === unitId);
    if (!inc || !unit) return false;
    if (inc.status === 'resolved') return false;
    if (unit.status !== 'idle') return false;
    return true;
  }

  createIncidentFromCall(call, template){
    const id = uid('inc');
    const hotspotName = template.scenario?.hotspot || 'Centro';
    const hotspot = this.state.city.hotspots.find(h=>h.name === hotspotName) || this.state.city.hotspots[0];

    // small random offset around hotspot
    const x = clamp(hotspot.x + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random()*2), 0, this._gridW-1);
    const y = clamp(hotspot.y + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random()*2), 0, this._gridH-1);

    const baseResolve = template.scenario?.resolveSec ?? 16;

    const incident = {
      id,
      type: template.scenario?.incidentType || template.serviceHint || 'police',
      expectedUnitType: expectedUnitTypeFromIncident(template.scenario?.incidentType || template.serviceHint),
      severity: template.severity || 'low',
      x, y,
      status: 'pending', // pending | enroute | onscene | resolved
      resolveSec: baseResolve,
      assignedUnitId: null,
      mismatch: false,
      report: {
        success: 'Ocorrência encerrada com sucesso.',
        failure: 'Resposta inadequada/atraso levou a desfecho negativo.'
      }
    };

    this.state.incidents.push(incident);
    this.state.selectedIncidentId = incident.id;
    this.ui.renderSelectedIncidentLabel();
    this.renderAllMarkers();
    return incident;
  }

  dispatchSelected(){
    if (!this._canDispatch()) return { ok:false, reason:'Selecione incidente e unidade disponível.' };

    const inc = this.state.incidents.find(i=>i.id === this.state.selectedIncidentId);
    const unit = this.state.units.find(u=>u.id === this.state.selectedUnitId);

    inc.assignedUnitId = unit.id;
    inc.status = 'enroute';

    // mismatch check
    inc.mismatch = unit.type !== inc.expectedUnitType;

    unit.status = 'enroute';
    unit.target = { x: inc.x, y: inc.y, incidentId: inc.id };

    this.audio.playRadio();
    this.renderAllMarkers();
    this.ui.renderUnits();
    this.ui.setDispatchEnabled(false);

    return { ok:true, incident: inc, unit };
  }

  update(dt){
    const speed = this.state.config.unitSpeedCellsPerSec;

    for (const unit of this.state.units){
      if (unit.status !== 'enroute' || !unit.target) continue;
      const key = unit.id;
      let acc = (this._unitTimers.get(key) ?? 0) + (speed * dt);

      while (acc >= 1){
        const dx = unit.target.x - unit.x;
        const dy = unit.target.y - unit.y;
        if (dx === 0 && dy === 0) break;

        if (Math.abs(dx) > 0) unit.x += Math.sign(dx);
        else if (Math.abs(dy) > 0) unit.y += Math.sign(dy);

        unit.x = clamp(unit.x, 0, this._gridW-1);
        unit.y = clamp(unit.y, 0, this._gridH-1);

        acc -= 1;
      }
      this._unitTimers.set(key, acc);

      if (unit.x === unit.target.x && unit.y === unit.target.y){
        unit.status = 'onscene';
        const inc = this.state.incidents.find(i=>i.id === unit.target.incidentId);
        if (inc && inc.status !== 'resolved'){
          inc.status = 'onscene';
        }
      }
    }

    for (const inc of this.state.incidents){
      if (inc.status !== 'onscene') continue;
      inc.resolveSec -= dt;
      if (inc.resolveSec <= 0){
        this.resolveIncident(inc.id);
      }
    }

    this.renderAllMarkers();
  }

  resolveIncident(incidentId){
    const inc = this.state.incidents.find(i=>i.id === incidentId);
    if (!inc || inc.status === 'resolved') return null;
    inc.status = 'resolved';

    const unit = this.state.units.find(u=>u.id === inc.assignedUnitId);
    if (unit){
      unit.status = 'idle';
      unit.target = null;
    }

    this.ui.renderUnits();
    this.ui.renderSelectedIncidentLabel();
    this.renderAllMarkers();

    return { incident: inc, unit };
  }
}
