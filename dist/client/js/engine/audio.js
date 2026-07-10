(function () {
  "use strict";
  const OA = window.OrbArena;

  class AudioSystem {
    constructor(enabled = true) {
      const settings = typeof enabled === "object" ? enabled : { enabled };
      this.enabled = settings.enabled !== false && settings.audio !== false;
      this.context = null;
      this.master = null;
      this.groups = Object.create(null);
      this.voices = new Set();
      this.voiceLimit = 24;
      this.volumes = { master: Number(settings.masterVolume ?? .8), effects: Number(settings.effectsVolume ?? .8), ui: Number(settings.uiVolume ?? .7), music: Number(settings.musicVolume ?? .55), ambience: Number(settings.ambienceVolume ?? .5) };
    }

    unlock() {
      if (!this.enabled) return;
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0.09 * this.volumes.master;
        this.master.connect(this.context.destination);
        for (const name of ["effects", "ui", "music", "ambience"]) { const group = this.context.createGain(); group.gain.value = this.volumes[name]; group.connect(this.master); this.groups[name] = group; }
      }
      if (this.context.state === "suspended") this.context.resume();
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (this.master) this.master.gain.value = enabled ? 0.09 * this.volumes.master : 0;
    }

    setVolume(channel, value) { const amount = OA.clamp(Number(value), 0, 1); this.volumes[channel] = amount; if (channel === "master" && this.master) this.master.gain.value = this.enabled ? .09 * amount : 0; else if (this.groups[channel]) this.groups[channel].gain.value = amount; }

    tone(frequency, duration, type = "sine", volume = 0.5, slide = 0, delay = 0, channel = "effects", pan = 0) {
      if (!this.enabled) return;
      this.unlock();
      if (!this.context || !this.master) return;
      if (this.voices.size >= this.voiceLimit && channel !== "ui") return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
      gain.gain.setValueAtTime(Math.max(0.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      const destination = this.groups[channel] || this.groups.effects || this.master;
      if (this.context.createStereoPanner) { const panner = this.context.createStereoPanner(); panner.pan.value = OA.clamp(pan, -1, 1); oscillator.connect(gain).connect(panner).connect(destination); }
      else oscillator.connect(gain).connect(destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); try { oscillator.disconnect(); gain.disconnect(); } catch (_) { /* already released */ } };
      oscillator.start(now);
      oscillator.stop(now + duration);
    }

    impact(relativeSpeed, energy = relativeSpeed) {
      const strength = OA.clamp(energy / 620, 0.12, 1);
      this.tone(165 - strength * 105, 0.09 + strength * 0.08, "triangle", 0.12 + strength * 0.24, -38);
      if (strength > 0.55) this.tone(52, 0.2, "sine", strength * 0.18, -15, 0.015);
    }

    wall(speed, boosted) {
      const strength = OA.clamp(speed / 800, 0.12, 1);
      this.tone(boosted ? 330 : 210, boosted ? 0.16 : 0.09, boosted ? "sawtooth" : "triangle", 0.1 + strength * 0.15, boosted ? 160 : -45);
    }

    projectile(speed, kind) {
      const base = kind === "missile" || kind === "mine" ? 82 : 190 + Math.min(260, speed * 0.18);
      this.tone(base, kind === "missile" ? 0.16 : 0.07, kind === "laser" ? "square" : "triangle", 0.12, kind === "laser" ? 280 : -35);
    }

    weapon(pattern, damage) {
      const heavy = pattern === "smash" || damage > 22;
      this.tone(heavy ? 72 : 155, heavy ? 0.18 : 0.075, heavy ? "sawtooth" : "triangle", heavy ? 0.18 : 0.1, heavy ? -28 : 65);
    }

    ability(category, power) {
      const frequency = { movimento: 310, impacto: 85, controle: 185, defesa: 410, ofensivo: 245, caos: 125, reativo: 520, temporal: 360, clones: 285, veneno: 118, gravidade: 64, elemental: 215, arena: 145, ultimate: 72 }[category] || 240;
      this.tone(frequency, 0.16, category === "caos" ? "sawtooth" : "sine", 0.15, category === "defesa" ? 120 : -25);
      if (power > 30) this.tone(frequency * 1.5, 0.22, "triangle", 0.08, 60, 0.04);
    }
    skillPhase(phase, ability) { const base={Temporal:350,Veneno:125,Fogo:205,Gelo:410,Gravidade:76,Luz:520,Trevas:112,Clone:290,Elétrico:455,Caos:138,Cinético:230,Arcano:315,Escudo:390,Energia:270}[ability.element]||250;if(phase==="cast")this.tone(base,.1,"sine",.065,55,0,"effects");else if(phase==="critical")this.tone(base*.72,.2,"sawtooth",.13,-40,0,"effects");else this.tone(base*.88,.07,"triangle",.075,-25,0,"effects"); }

    countdown(number) { this.tone(number === 0 ? 620 : 300 + number * 45, number === 0 ? 0.24 : 0.1, "square", 0.18, 80); }
    interface(kind="select") { this.tone(kind==="confirm"?520:390,.055,"sine",.07,45,0,"ui"); }
    movement(speed=300) { this.tone(180+Math.min(220,speed*.25),.045,"triangle",.035,30); }
    clone() { this.ability("clones",18); }
    poison() { this.ability("veneno",16); }
    temporal() { this.ability("temporal",24); }
    gravity() { this.ability("gravidade",28); }
    ultimate() { this.ability("ultimate",70); }
    victory() { [0, 0.12, 0.25].forEach((delay, index) => setTimeout(() => this.tone([330, 440, 660][index], 0.3, "triangle", 0.22, 70), delay * 1000)); }
    defeat() { this.tone(180, 0.55, "sawtooth", 0.18, -110); }
    powerUp() { this.tone(460,.13,"sine",.12,180); }
    killFeed() { this.tone(240,.08,"square",.07,-35,0,"ui"); }
    cancel() { this.tone(170,.06,"triangle",.06,-55,0,"ui"); }
    dispose() { for (const voice of this.voices) try { voice.stop(); } catch (_) {} this.voices.clear(); }
  }

  OA.AudioSystem = AudioSystem;
}());
