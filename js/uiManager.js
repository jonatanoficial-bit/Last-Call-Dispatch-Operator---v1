import { formatClock, severityLabel } from './util.js';

export class UIManager{
  constructor(state, audio){
    this.state = state;
    this.audio = audio;

    this.els = {
      hudCity: document.getElementById('hudCity'),
      hudShift: document.getElementById('hudShift'),
      hudScore: document.getElementById('hudScore'),

      btnStart: document.getElementById('btnStart'),
      btnRestart: document.getElementById('btnRestart'),
      btnPause: document.getElementById('btnPause'),

      callSeverity: document.getElementById('callSeverity'),
      callTimer: document.getElementById('callTimer'),
      callTranscript: document.getElementById('callTranscript'),
      callOptions: document.getElementById('callOptions'),
      factAddress: document.getElementById('factAddress'),
      factDetails: document.getElementById('factDetails'),
      factInjuries: document.getElementById('factInjuries'),

      btnHold: document.getElementById('btnHold'),
      btnEnd: document.getElementById('btnEnd'),

      gridMap: document.getElementById('gridMap'),
      unitList: document.getElementById('unitList'),
      btnDispatch: document.getElementById('btnDispatch'),
      selectedIncident: document.getElementById('selectedIncident'),

      queueList: document.getElementById('queueList'),
      queueCount: document.getElementById('queueCount'),
      btnAnswerNext: document.getElementById('btnAnswerNext'),

      toast: document.getElementById('toast'),

      modal: document.getElementById('modal'),
      modalBody: document.getElementById('modalBody'),
      btnCloseModal: document.getElementById('btnCloseModal'),
    };

    this._typeToken = 0;
  }

  bindHandlers(handlers){
    this.handlers = handlers;

    this.els.btnStart.addEventListener('click', ()=>handlers.onStart());
    this.els.btnRestart.addEventListener('click', ()=>handlers.onRestart());
    this.els.btnPause.addEventListener('click', ()=>handlers.onPauseToggle());

    this.els.btnHold.addEventListener('click', ()=>handlers.onHoldActive());
    this.els.btnEnd.addEventListener('click', ()=>handlers.onEndActive());

    this.els.btnDispatch.addEventListener('click', ()=>handlers.onDispatch());
    this.els.btnAnswerNext.addEventListener('click', ()=>handlers.onAnswerSelected());

    this.els.btnCloseModal.addEventListener('click', ()=>this.hideModal());
  }

  updateHUD(){
    this.els.hudCity.textContent = this.state.city?.name ?? '—';
    const remaining = Math.max(0, this.state.config.shiftDurationSec - this.state.shiftElapsed);
    this.els.hudShift.textContent = formatClock(remaining);
    this.els.hudScore.textContent = String(this.state.score);

    this.els.btnRestart.disabled = !this.state.running && this.state.shiftElapsed === 0;
    this.els.btnPause.disabled = !this.state.running;
    this.els.btnPause.textContent = this.state.paused ? 'Continuar' : 'Pausar';
  }

  toast(msg){
    const el = this.els.toast;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(()=>el.classList.remove('show'), 1800);
  }

  clearCallUI(){
    this.els.callSeverity.textContent = '—';
    this.els.callTimer.textContent = '—';
    this.els.callTranscript.textContent = '';
    this.els.callOptions.innerHTML = '';
    this.els.factAddress.textContent = '—';
    this.els.factDetails.textContent = '—';
    this.els.factInjuries.textContent = '—';
    this.els.btnHold.disabled = true;
    this.els.btnEnd.disabled = true;
  }

  renderActiveCall(call, template){
    if (!call){
      this.clearCallUI();
      return;
    }

    // badges
    this.els.callSeverity.textContent = `Risco ${severityLabel(call.severity)}`;
    this.els.callTimer.textContent = `Tempo ${formatClock(call.timeLeft)}`;

    // facts
    this.els.factAddress.textContent = call.factAddress;
    this.els.factDetails.textContent = call.factDetails;
    this.els.factInjuries.textContent = call.factInjuries;

    // transcript
    this._typeToken += 1;
    const token = this._typeToken;
    this.els.callTranscript.textContent = '';
    const full = call.transcript.join('\n');
    this.typewriterSet(full, 22, token);

    // options
    this.els.callOptions.innerHTML = '';
    for (const opt of this.handlers.getCallOptions(call, template)){
      const b = document.createElement('button');
      b.className = 'optionBtn';
      b.textContent = opt.label;
      b.disabled = !!opt.disabled;
      b.addEventListener('click', ()=>{
        this.audio.playClick();
        opt.onClick();
      });
      this.els.callOptions.appendChild(b);
    }

    this.els.btnHold.disabled = false;
    this.els.btnEnd.disabled = false;
  }

  async typewriterSet(text, cps=22, token=this._typeToken){
    const el = this.els.callTranscript;
    el.textContent = '';
    const delay = 1000 / Math.max(1, cps);
    for (let i=0; i<text.length; i++){
      if (token !== this._typeToken) return;
      el.textContent += text[i];
      if (i % 2 === 0){
        el.scrollTop = el.scrollHeight;
      }
      await new Promise(r=>setTimeout(r, delay));
    }
    el.scrollTop = el.scrollHeight;
  }

  renderQueue(){
    const q = this.state.callQueue.filter(c=>c.status !== 'closed');
    this.els.queueCount.textContent = String(q.length);
    this.els.queueList.innerHTML = '';

    const activeId = this.state.activeCallId;

    for (const c of q){
      const card = document.createElement('div');
      card.className = 'queueCard' + (this.state.selectedQueueCallId === c.rid ? ' selected' : '');
      card.addEventListener('click', ()=>{
        this.audio.playClick();
        this.state.selectedQueueCallId = c.rid;
        this.renderQueue();
        this.els.btnAnswerNext.disabled = (c.rid === activeId) ? true : false;
      });

      const top = document.createElement('div');
      top.className = 'queueTop';

      const title = document.createElement('div');
      title.className = 'queueTitle';
      title.textContent = c.status === 'hold' ? `Em espera • ${c.templateId}` : c.templateId;

      const meta = document.createElement('div');
      meta.className = 'queueMeta';

      const sev = document.createElement('span');
      sev.className = 'badge ' + c.severity;
      sev.textContent = severityLabel(c.severity);

      const t = document.createElement('span');
      t.className = 'badge';
      t.textContent = formatClock(c.timeLeft);

      meta.appendChild(sev);
      meta.appendChild(t);

      top.appendChild(title);
      top.appendChild(meta);

      const body = document.createElement('div');
      body.className = 'queueBody';
      body.textContent = (c.transcript[0] || '').slice(0, 120);

      card.appendChild(top);
      card.appendChild(body);
      this.els.queueList.appendChild(card);
    }

    this.els.btnAnswerNext.disabled = !this.state.selectedQueueCallId || this.state.selectedQueueCallId === this.state.activeCallId;
  }

  renderSelectedIncidentLabel(){
    const id = this.state.selectedIncidentId;
    if (!id){
      this.els.selectedIncident.textContent = 'Incidente: —';
      return;
    }
    const inc = this.state.incidents.find(i=>i.id === id);
    if (!inc){
      this.els.selectedIncident.textContent = 'Incidente: —';
      return;
    }
    this.els.selectedIncident.textContent = `Incidente: ${inc.id} • ${inc.type.toUpperCase()} • ${inc.status}`;
  }

  renderUnits(){
    this.els.unitList.innerHTML = '';
    for (const u of this.state.units){
      const chip = document.createElement('div');
      chip.className = 'unitChip' + (u.id === this.state.selectedUnitId ? ' selected' : '') + (u.status !== 'idle' ? ' busy' : '');
      chip.addEventListener('click', ()=>{
        if (u.status !== 'idle') return;
        this.audio.playClick();
        this.state.selectedUnitId = u.id;
        this.renderUnits();
        this.handlers.onUnitSelected?.(u.id);
      });

      const id = document.createElement('div'); id.className='uId'; id.textContent = u.id;
      const t = document.createElement('div'); t.className='uType'; t.textContent = u.type;
      const s = document.createElement('div'); s.className='uStatus'; s.textContent = u.status;

      chip.appendChild(id); chip.appendChild(t); chip.appendChild(s);
      this.els.unitList.appendChild(chip);
    }
  }

  setDispatchEnabled(enabled){
    this.els.btnDispatch.disabled = !enabled;
  }

  showModal(text){
    this.els.modalBody.textContent = text;
    this.els.modal.classList.remove('hidden');
  }
  hideModal(){
    this.els.modal.classList.add('hidden');
  }
}
