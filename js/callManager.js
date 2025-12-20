import { pick, formatClock } from './util.js';

function sevKey(sev){
  if (sev === 'high') return 'high';
  if (sev === 'medium') return 'medium';
  return 'low';
}

export class CallManager{
  constructor(state, ui, audio, dispatch){
    this.state = state;
    this.ui = ui;
    this.audio = audio;
    this.dispatch = dispatch;

    this._spawnTimer = 0;
  }

  startShift(){
    this._spawnTimer = 0;
    // pré-carrega algumas chamadas
    this._ensureQueueSeed(2);
  }

  _ensureQueueSeed(n){
    for (let i=0; i<n; i++){
      if (this.state.callQueue.filter(c=>c.status !== 'closed').length >= this.state.config.queueMax) return;
      this.spawnCall();
    }
  }

  spawnCall(){
    const template = pick(this.state.callsData);
    const call = this.state.makeRuntimeCall(template);

    // transcript first line
    call.transcript.push(`☎️ ${template.opening}`);
    this.state.callQueue.push(call);

    // ring feedback
    this.audio.playRingOnce();
    return call;
  }

  getTemplateById(id){ return this.state.callsData.find(c=>c.id === id); }

  update(dt){
    // decrement timers for all open calls
    for (const call of this.state.callQueue){
      if (call.status === 'closed') continue;
      call.timeLeft -= dt;
      call._elapsed += dt;

      // fire timed events when active or hold/ringing too (simulates evolving situation)
      const template = this.getTemplateById(call.templateId);
      if (template?.events?.length){
        for (const ev of template.events){
          if (call._eventsFired.has(ev.t)) continue;
          if (call._elapsed >= ev.t){
            call._eventsFired.add(ev.t);
            call.transcript.push(`\n⚠️ Atualização: ${ev.text}`);
            if (ev.escalate?.severity){
              call.severity = ev.escalate.severity;
            }
          }
        }
      }

      if (call.timeLeft <= 0){
        this._handleMissedCall(call);
      }
    }

    // spawn new calls over time
    if (!this.state.running) return;
    this._spawnTimer += dt;
    if (this._spawnTimer >= this.state.config.callSpawnEverySec){
      this._spawnTimer = 0;
      const openCount = this.state.callQueue.filter(c=>c.status !== 'closed').length;
      if (openCount < this.state.config.queueMax){
        this.spawnCall();
        this.ui.toast('Nova chamada na fila.');
      }
    }
  }

  _handleMissedCall(call){
    if (call.status === 'closed') return;
    call.status = 'closed';

    const penalty = this.state.config.missedCallPenalty[sevKey(call.severity)] ?? 10;
    this.state.addScore(-penalty);

    if (this.state.activeCallId === call.rid){
      this.state.activeCallId = null;
      this.ui.toast('Chamada perdida (tempo esgotado).');
    }
    if (this.state.selectedQueueCallId === call.rid){
      this.state.selectedQueueCallId = null;
    }
    this.audio.playError();
  }

  // ==== Active call lifecycle ====
  answerCall(callRid){
    const call = this.state.callQueue.find(c=>c.rid === callRid && c.status !== 'closed');
    if (!call) return false;

    // If another active call exists, auto-hold it
    if (this.state.activeCallId && this.state.activeCallId !== callRid){
      this.holdActive(true);
    }

    call.status = 'active';
    this.state.activeCallId = call.rid;
    this.state.selectedQueueCallId = call.rid;

    // reset some time lost penalty if switching
    call.timeLeft = Math.max(1, call.timeLeft - this.state.config.onHoldPenaltySec);

    this.audio.stopRinging();
    this.ui.toast('Chamada atendida.');

    return true;
  }

  holdActive(auto=false){
    const id = this.state.activeCallId;
    if (!id) return false;
    const call = this.state.callQueue.find(c=>c.rid === id);
    if (!call) return false;

    call.status = 'hold';
    call.timeLeft = Math.max(1, call.timeLeft - this.state.config.onHoldPenaltySec);

    this.state.activeCallId = null;
    if (!auto) this.ui.toast('Chamada em espera.');
    return true;
  }

  endActive(){
    const id = this.state.activeCallId;
    if (!id) return false;
    const call = this.state.callQueue.find(c=>c.rid === id);
    if (!call) return false;

    call.status = 'closed';
    this.state.activeCallId = null;
    this.state.selectedQueueCallId = null;
    this.ui.toast('Chamada encerrada.');
    return true;
  }

  getActiveCall(){
    if (!this.state.activeCallId) return null;
    return this.state.callQueue.find(c=>c.rid === this.state.activeCallId) ?? null;
  }

  // ==== Options logic ====
  getOptions(call){
    const template = this.getTemplateById(call.templateId);
    if (!template) return [];

    const opts = [];

    // Routing (AU 000 style)
    if (call.routingNeeded && !call.serviceSelected){
      opts.push({ label:'Roteamento: Polícia', onClick:()=>this._selectService(call, 'police', template) });
      opts.push({ label:'Roteamento: Bombeiros', onClick:()=>this._selectService(call, 'fire', template) });
      opts.push({ label:'Roteamento: Ambulância', onClick:()=>this._selectService(call, 'medical', template) });
      opts.push({ label:'Perguntar: endereço primeiro', onClick:()=>this._askAddress(call, template) });
      return opts;
    }

    // Core protocol questions
    if (!call.addressKnown){
      opts.push({ label:'Perguntar: Qual é o endereço exato?', onClick:()=>this._askAddress(call, template) });
    }
    if (!call.detailsKnown){
      opts.push({ label:'Perguntar: O que está acontecendo?', onClick:()=>this._askDetails(call, template) });
    }
    if (!call.injuriesKnown){
      opts.push({ label:'Perguntar: Há feridos? A vítima está consciente?', onClick:()=>this._askInjuries(call, template) });
    }

    // Trote handling / triage
    if (call.prank && call.detailsKnown){
      opts.push({ label:'Triagem: Encerrar como trote (sem despacho)', onClick:()=>this._closeAsPrank(call, template) });
    }

    // Instructions (once we have at least details)
    if (!call.instructionDone && call.detailsKnown){
      opts.push({ label:'Dar instruções pré-chegada', onClick:()=>this._doInstructions(call, template) });
    }

    // Dispatch creation request
    const canCreateIncident = call.addressKnown && call.detailsKnown && !call.incidentId;
    if (canCreateIncident){
      opts.push({ label:'Criar ocorrência e preparar despacho', onClick:()=>this._createIncident(call, template) });
    }

    // After incident created: guide player to dispatch
    if (call.incidentId && !call.waitingForDispatch){
      opts.push({ label:'Confirmar: despachar unidade agora (no mapa)', onClick:()=>this._waitForDispatch(call, template) });
    }

    // If waiting for dispatch and incident unresolved
    if (call.waitingForDispatch){
      opts.push({ label:'Manter chamador calmo e na linha', onClick:()=>this._reassure(call, template) });
    }

    // Safe end if incident already dispatched/resolved
    if (call.incidentId){
      opts.push({ label:'Encerrar chamada (após despacho)', onClick:()=>this._endAfterDispatch(call, template) });
    }

    return opts;
  }

  _append(call, text){
    call.transcript.push(text);
  }

  _selectService(call, chosen, template){
    call.serviceSelected = chosen;
    const expected = template.scenario?.incidentType === 'police' ? 'police'
                  : template.scenario?.incidentType === 'medical' ? 'medical'
                  : template.scenario?.incidentType === 'rescue' ? 'fire'
                  : template.scenario?.incidentType === 'fire' ? 'fire'
                  : template.serviceHint;

    if (expected && expected !== 'any' && chosen !== expected){
      this.state.addScore(-6);
      call.timeLeft = Math.max(1, call.timeLeft - 8);
      this.audio.playError();
      this._append(call, `\n❌ Roteamento incorreto. Perda de tempo na transferência. (-6 pontos)`);
    }else{
      this.state.addScore(+4);
      this.audio.playResolve();
      this._append(call, `\n✅ Serviço roteado corretamente. (+4 pontos)`);
    }
    call.routingNeeded = false;
  }

  _askAddress(call, template){
    call.addressKnown = true;
    call.factAddress = template.protocol?.addressLine || 'Endereço informado.';
    this._append(call, `\n👤 Endereço: ${call.factAddress}`);
  }

  _askDetails(call, template){
    call.detailsKnown = true;
    call.factDetails = template.protocol?.detailsLine || 'Detalhes informados.';
    this._append(call, `\n👤 Detalhes: ${call.factDetails}`);
  }

  _askInjuries(call, template){
    call.injuriesKnown = true;
    call.factInjuries = template.protocol?.injuriesLine || 'Sem informações adicionais.';
    this._append(call, `\n👤 Vítimas: ${call.factInjuries}`);
  }

  _doInstructions(call, template){
    call.instructionDone = true;
    const inst = template.instructions;
    if (!inst?.options?.length){
      this._append(call, `\nℹ️ Nenhuma instrução específica disponível. Mantenha a calma e aguarde.`);
      return;
    }
    // Present instruction prompt then auto-open mini-choice by turning options into temporary choices:
    // We'll store a transient field so UI can show 3 instruction options next render.
    call._instructionPrompt = inst.prompt;
    call._instructionOptions = inst.options.map(o=>({ ...o }));
    this._append(call, `\n\n🧠 ${inst.prompt}`);
  }

  // For UI: when instruction options exist, override option list
  getInstructionOverride(call){
    if (!call._instructionOptions) return null;
    return call._instructionOptions.map(o=>({
      label: o.label,
      onClick: ()=>this._chooseInstruction(call, o)
    }));
  }

  _chooseInstruction(call, opt){
    const isCorrect = !!opt.correct;
    call.instructionCorrect = isCorrect;

    delete call._instructionOptions;
    delete call._instructionPrompt;

    if (isCorrect){
      this.state.addScore(+10);
      this.audio.playResolve();
      this._append(call, `\n✅ Instrução correta. (+10 pontos)`);
    }else{
      this.state.addScore(-12);
      this.audio.playError();
      this._append(call, `\n❌ Instrução inadequada. (-12 pontos)`);
    }
  }

  _createIncident(call, template){
    // If prank and user creates incident -> penalty
    if (call.prank){
      this.state.addScore(-20);
      this.audio.playError();
      this._append(call, `\n❌ Era trote. Despacho desnecessário. (-20 pontos)`);
    } else {
      this.state.addScore(+6);
      this.audio.playResolve();
      this._append(call, `\n✅ Ocorrência registrada no sistema. (+6 pontos)`);
    }

    const inc = this.dispatch.createIncidentFromCall(call, template);
    call.incidentId = inc.id;
    this.state.selectedIncidentId = inc.id;
  }

  _waitForDispatch(call, template){
    call.waitingForDispatch = true;
    this.ui.toast('Despache uma unidade no mapa.');
  }

  _reassure(call){
    this._append(call, `\n📣 Operador: "Entendi. A ajuda está a caminho. Fique em segurança e me mantenha informado."`);
    call.timeLeft = Math.max(1, call.timeLeft - 2);
  }

  _endAfterDispatch(call){
    // keep call open; player can end, but if dispatch not done -> penalty
    if (!call.incidentId){
      this.state.addScore(-4);
      this.audio.playError();
      this._append(call, `\n❌ Encerramento prematuro sem ocorrência registrada. (-4 pontos)`);
    }
    call.status = 'closed';
    this.state.activeCallId = null;
    this.state.selectedQueueCallId = null;
    this.ui.toast('Chamada finalizada.');
  }

  _closeAsPrank(call){
    // Good: identify trote
    this.state.addScore(+12);
    this.audio.playResolve();
    this._append(call, `\n✅ Trote identificado. Chamada encerrada. (+12 pontos)`);
    call.status = 'closed';
    this.state.activeCallId = null;
    this.state.selectedQueueCallId = null;
  }

  // Called by Main when dispatch resolves an incident
  onIncidentResolved(res){
    const { incident, unit } = res || {};
    if (!incident) return;

    // find related call
    const call = this.state.callQueue.find(c => c.incidentId === incident.id && c.status !== 'closed');
    if (!call) return;

    const mismatch = incident.mismatch;
    if (mismatch){
      const penalty = incident.severity === 'high' ? 30 : incident.severity === 'medium' ? 20 : 12;
      this.state.addScore(-penalty);
      this.audio.playError();
      call.transcript.push(`\n\n📄 Relatório: Unidade inadequada enviada. Resultado pior. (-${penalty} pontos)`);
    }else{
      const bonus = incident.severity === 'high' ? 30 : incident.severity === 'medium' ? 20 : 10;
      this.state.addScore(+bonus);
      this.audio.playResolve();
      call.transcript.push(`\n\n📄 Relatório: Ocorrência encerrada com sucesso. (+${bonus} pontos)`);
    }

    call.waitingForDispatch = false;
    call.status = 'closed';

    if (this.state.activeCallId === call.rid) this.state.activeCallId = null;
    if (this.state.selectedQueueCallId === call.rid) this.state.selectedQueueCallId = null;
  }
}
