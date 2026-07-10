(function () {
  "use strict";
  const OA = window.OrbArena;
  const THEMES = Object.freeze({ menu: [110, 165, 220], draft: [130, 195, 260], loading: [90, 135, 180], opening: [120, 180, 240], escalation: [138, 207, 276], climax: [155, 232, 310], suddenDeath: [82, 123, 164], boss: [62, 93, 124], victory: [220, 330, 440], defeat: [72, 108, 144] });
  class MusicSystem {
    constructor(audio, settings = {}) { this.audio = audio; this.settings = settings; this.state = "menu"; this.beat = 0; this.step = 0; this.enabled = settings.music !== false; }
    setState(state) { if (THEMES[state] && state !== this.state) { this.state = state; this.step = 0; this.beat = 0; } }
    update(world, dt) {
      if (!this.enabled || !this.audio?.enabled) return;
      const desired = world ? (world.mode === "boss" ? "boss" : world.battlePhase || "opening") : this.state;
      if (THEMES[desired] && desired !== this.state) this.setState(desired);
      this.beat -= dt; if (this.beat > 0) return;
      const urgent = this.state === "climax" || this.state === "suddenDeath", interval = urgent ? .32 : .52, notes = THEMES[this.state] || THEMES.menu, note = notes[this.step++ % notes.length];
      this.beat = interval; this.audio.tone(note, interval * .75, "sine", .018 * (Number(this.settings.musicVolume ?? .65)), this.step % 3 ? 12 : -8, 0, "music");
      if (urgent && this.step % 2 === 0) this.audio.tone(note / 2, .18, "triangle", .012, -4, 0, "music");
    }
    setEnabled(enabled) { this.enabled = enabled; }
  }
  OA.MusicSystem = MusicSystem;
}());
