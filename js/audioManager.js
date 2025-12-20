export class AudioManager{
  constructor(){
    this.enabled = true;
    this.ctx = null;
    this._ringOsc = null;
    this._ringGain = null;
  }

  _ensure(){
    if (!this.ctx){
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended'){
      this.ctx.resume().catch(()=>{});
    }
  }

  _beep(freq=880, dur=0.07, gain=0.08){
    if (!this.enabled) return;
    this._ensure();
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur);
  }

  playClick(){ this._beep(980, 0.05, 0.06); }
  playResolve(){ this._beep(660, 0.08, 0.08); setTimeout(()=>this._beep(990, 0.08, 0.06), 80); }
  playError(){ this._beep(220, 0.10, 0.10); }
  playRadio(){ this._beep(540, 0.06, 0.06); setTimeout(()=>this._beep(820, 0.06, 0.05), 65); }
  playRingOnce(){ this._beep(1200, 0.06, 0.07); setTimeout(()=>this._beep(900, 0.06, 0.05), 70); }

  startRinging(){
    if (!this.enabled) return;
    this._ensure();
    if (this._ringOsc) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0, t0);
    o.connect(g).connect(this.ctx.destination);
    o.start();
    this._ringOsc = o;
    this._ringGain = g;

    // pulso
    let on = false;
    this._ringTimer = setInterval(()=>{
      if (!this._ringGain) return;
      on = !on;
      const t = this.ctx.currentTime;
      this._ringGain.gain.cancelScheduledValues(t);
      this._ringGain.gain.setValueAtTime(on ? 0.04 : 0.0, t);
    }, 220);
  }

  stopRinging(){
    if (this._ringTimer) clearInterval(this._ringTimer);
    this._ringTimer = null;
    if (this._ringOsc){
      try{ this._ringOsc.stop(); }catch{}
      this._ringOsc = null;
    }
    this._ringGain = null;
  }
}
