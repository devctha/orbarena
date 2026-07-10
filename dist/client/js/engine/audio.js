(function () {
  "use strict";
  const OA = window.OrbArena;

  class AudioSystem {
    constructor(enabled = true) {
      this.enabled = enabled;
      this.context = null;
      this.master = null;
    }

    unlock() {
      if (!this.enabled) return;
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0.09;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") this.context.resume();
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (this.master) this.master.gain.value = enabled ? 0.09 : 0;
    }

    tone(frequency, duration, type = "sine", volume = 0.5, slide = 0, delay = 0) {
      if (!this.enabled) return;
      this.unlock();
      if (!this.context || !this.master) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
      gain.gain.setValueAtTime(Math.max(0.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain).connect(this.master);
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

    countdown(number) { this.tone(number === 0 ? 620 : 300 + number * 45, number === 0 ? 0.24 : 0.1, "square", 0.18, 80); }
    interface(kind="select") { this.tone(kind==="confirm"?520:390,.055,"sine",.07,45); }
    movement(speed=300) { this.tone(180+Math.min(220,speed*.25),.045,"triangle",.035,30); }
    clone() { this.ability("clones",18); }
    poison() { this.ability("veneno",16); }
    temporal() { this.ability("temporal",24); }
    gravity() { this.ability("gravidade",28); }
    ultimate() { this.ability("ultimate",70); }
    victory() { [0, 0.12, 0.25].forEach((delay, index) => setTimeout(() => this.tone([330, 440, 660][index], 0.3, "triangle", 0.22, 70), delay * 1000)); }
    defeat() { this.tone(180, 0.55, "sawtooth", 0.18, -110); }
  }

  OA.AudioSystem = AudioSystem;
}());
