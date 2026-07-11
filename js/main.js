(function () {
  "use strict";
  const OA = window.OrbArena;

  class App {
    constructor() {
      this.state = new OA.State();
      this.storage = new OA.Storage(OA.CONFIG.storageKey);
      this.api = new OA.ApiClient();
      const saved = this.storage.read();
      this.state.settings = { ...this.state.settings, ...saved.settings };
      this.audio = new OA.AudioSystem(this.state.settings);
      this.balance = new OA.CharacterBalanceSystem();
      this.matchups = new OA.MatchupSystem();
      this.unlocks = new OA.CharacterUnlockSystem(this.storage);
      this.characterStats = new OA.CharacterStatsSystem(this.storage);
      this.simulator = new OA.CharacterSimulationSystem(this.balance, this.matchups);
      this.buildSystem = new OA.BuildSystem(this.storage);
      this.progression = new OA.ProgressionSystem(this.storage);
      this.menuUI = new OA.MenuUI(this);
      this.settingsUI = new OA.SettingsUI(this);
      this.characterSelectUI = new OA.CharacterSelectUI(this);
      this.powerLibraryUI = new OA.PowerLibraryUI(this);
      this.buildUI = new OA.BuildUI(this);
      this.archiveUI = new OA.ArchiveUI(this);
      this.catalogUI = new OA.CatalogUI(this);
      this.bestiaryUI = new OA.BestiaryUI(this);
      this.contentAudit = OA.ContentValidationSystem.validate();
      if (!this.contentAudit.valid) console.error("Falha na validação de conteúdo", this.contentAudit.errors);
      this.battleUI = new OA.BattleUI(this);
      this.resultsUI = new OA.ResultsUI(this);
      this.draftUI = new OA.DraftUI(this);
      this.remasterUI = new OA.RemasterUI(this);
      this.toolsUI = new OA.ToolsUI(this);
      this.visualLabUI = new OA.VisualLabUI(this);
      this.homeRemasterUI = new OA.HomeRemasterUI(this);
      this.sidebarUI = new OA.SidebarUI(this);
      this.accountUI = new OA.AccountHubUI(this, this.api);
      this.game = new OA.Game(document.querySelector("#arena-canvas"), this.audio, {
        onFrame: (world, loop, particles) => this.battleUI.update(world, loop, particles),
        onComplete: (result) => this.completeBattle(result)
      });
      this.lastSetup = null;
      this.bindGlobal();
      this.updateRecord();
      this.updateAudioButton();
      this.accountUI.initialize();
    }

    openCharacterSelect() { this.game.stop(); this.characterSelectUI.render(); this.showScreen("characters"); }
    randomCharacter() { const list = OA.CharacterRegistry.all().filter((x) => this.unlocks.isUnlocked(x.id)); return list[Math.floor(Math.random() * list.length)]; }
    chooseCharacter(character) { this.state.settings.characterId = character.id; this.storage.saveSettings(this.state.settings); this.openSetup(); this.toast(`${character.name} selecionada.`); }
    testCharacter(character) { this.state.settings.characterId = character.id; const build={characterId:character.id,name:character.name,color:character.color,stroke:character.glow,trailColor:character.secondary,preset:"balanced",score:this.balance.get(character.id),stats:{...character.stats}},enemyCharacterId=document.querySelector("#simulation-opponent").value; this.startBattle(build,"normal",OA.Random.createSeed(),OA.getPhysicsPreset("arcade"),{mode:"lab",enemyCharacterId}); }

    bindGlobal() {
      document.querySelectorAll("[data-go-home]").forEach((button) => button.addEventListener("click", () => this.goHome()));
      document.querySelectorAll("[data-top-screen]").forEach((button) => button.addEventListener("click", () => this.navigate(button.dataset.topScreen)));
      document.querySelector("#random-simulation-seed")?.addEventListener("click",()=>{document.querySelector("#simulation-seed").value=OA.Random.createSeed();});
      document.querySelector("#audio-toggle").addEventListener("click", () => {
        this.state.settings.audio = !this.state.settings.audio;
        this.audio.setEnabled(this.state.settings.audio);
        if (this.state.settings.audio) this.audio.unlock();
        this.storage.saveSettings(this.state.settings);
        this.updateAudioButton();
        this.toast(this.state.settings.audio ? "Áudio procedural ativado." : "Áudio desativado.");
      });
      window.addEventListener("error", (event) => {
        console.error("ORB ARENA runtime error:", event.error || event.message);
      });
    }

    showScreen(name) {
      document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === `screen-${name}`));
      this.state.set("screen", name);
      this.state.currentScreen = name;
      this.storage.saveUI(name);
      document.querySelectorAll("[data-top-screen]").forEach((button) => button.classList.toggle("active", button.dataset.topScreen === name));
      window.scrollTo(0, 0);
    }

    navigate(screen, selected = null) {
      if (screen === "characters") return this.openCharacterSelect();
      if (screen === "setup") return this.openSetup();
      if (screen === "build") return this.buildUI.open(selected);
      if (screen === "builds") return this.archiveUI.openBuilds(selected);
      if (screen === "history") return this.archiveUI.openHistory(selected);
      if (["arsenal", "perks", "abilities"].includes(screen)) return this.catalogUI.open(screen, selected);
      if (screen === "bestiary") return this.bestiaryUI.open(selected);
      if (["powers", "settings"].includes(screen)) return this.showScreen(screen);
      return this.goHome();
    }

    openSetup() {
      this.game.stop();
      if (this.state.build) this.menuUI.setBuild(this.state.build);
      this.menuUI.setSeed(OA.Random.createSeed());
      this.showScreen("setup");
    }

    quickBattle() {
      const preset = OA.CONFIG.presets.balanced, character=this.randomCharacter();
      const build = { characterId:character.id,name:character.name,color:character.color,stroke:character.glow,trailColor:character.secondary,preset:"balanced",controlMode:this.state.settings.controlMode||"AUTO",score:this.balance.get(character.id),stats:{...preset} };
      this.startBattle(build, "normal", OA.Random.createSeed(), OA.getPhysicsPreset("pinball"));
    }

    startBattle(build, difficulty, seed, physics = OA.getPhysicsPreset("arcade"), options = {}) {
      this.audio.unlock();
      this.state.set("build", build);
      this.lastSetup = { build: structuredClone(build), difficulty, seed, physics: structuredClone(physics), options: structuredClone(options) };
      options.buildId = build.id || null;
      this.game.settings = this.state.settings;
      const world = this.game.start(build, difficulty, seed, physics, options);
      this.game.setHitboxes(this.state.settings.hitboxes);
      this.game.setDebug(this.state.settings.debug);
      const difficultyLabel = OA.CONFIG.difficulties[difficulty]?.label || "Normal";
      this.battleUI.present(world, difficultyLabel);
      document.querySelector("#character-lab").hidden = world.mode !== "lab";
      this.state.settings.speed = 1;
      this.showScreen("battle");
      this.remasterUI?.matchIntro(world);
    }

    completeBattle(result) {
      this.state.set("lastBattle", result);
      const temporary = Boolean(this.lastSetup?.options?.temporary || this.lastSetup?.options?.mode === "lab" || this.lastSetup?.options?.mode === "build-test");
      result.buildId = this.lastSetup?.build?.id || null;
      result.mode = this.lastSetup?.options?.mode || "duel";
      if (!temporary) { this.storage.addBattle(result); this.progression.recordBattle(result, result.buildId); const unlocks=new OA.MetaGameSystem().unlocks(this.storage.read(),result); this.storage.setAchievements(unlocks.ids); result.newAchievements=unlocks.fresh; }
      else result.temporary = true;
      this.resultsUI.present(result);
      this.updateRecord();
      this.showScreen("results");
      if (!temporary) this.accountUI?.recordBattle(result);
    }

    restartBattle() {
      if (!this.lastSetup) return this.quickBattle();
      this.startBattle(structuredClone(this.lastSetup.build), this.lastSetup.difficulty, this.lastSetup.seed, structuredClone(this.lastSetup.physics), structuredClone(this.lastSetup.options || {}));
    }

    newEnemy() {
      if (!this.lastSetup) return this.quickBattle();
      this.startBattle(structuredClone(this.lastSetup.build), this.lastSetup.difficulty, OA.Random.createSeed(), structuredClone(this.lastSetup.physics), structuredClone(this.lastSetup.options || {}));
    }

    goHome() {
      this.game.stop();
      this.showScreen("menu");
      this.updateRecord();
      this.homeRemasterUI?.render();
    }

    togglePause() {
      if (this.state.screen !== "battle") return false;
      const paused = this.game.togglePause();
      this.battleUI.setPaused(paused);
      return paused;
    }

    setSpeed(speed) {
      this.game.setSpeed(speed);
      this.state.settings.speed = speed;
    }

    toggleHitboxes() {
      this.state.settings.hitboxes = !this.state.settings.hitboxes;
      this.game.setHitboxes(this.state.settings.hitboxes);
      return this.state.settings.hitboxes;
    }

    toggleDebug() {
      this.state.settings.debug = !this.state.settings.debug;
      this.game.setDebug(this.state.settings.debug);
      return this.state.settings.debug;
    }

    async copySeed() {
      const seed = this.state.lastBattle?.seed;
      if (!seed) return;
      try {
        await navigator.clipboard.writeText(seed);
        this.toast("Seed copiada para a área de transferência.");
      } catch (error) {
        const input = document.createElement("textarea");
        input.value = seed;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        this.toast("Seed copiada.");
      }
    }

    updateRecord() { this.menuUI.updateRecord(this.storage.getRecord()); }

    updateAudioButton() {
      const button = document.querySelector("#audio-toggle");
      button.classList.toggle("active", this.state.settings.audio);
      button.querySelector("span").textContent = this.state.settings.audio ? "◖))" : "◖×";
      button.setAttribute("aria-pressed", String(this.state.settings.audio));
    }

    toast(message, type = "info") {
      const region = document.querySelector("#toast-region");
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      region.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  window.addEventListener("DOMContentLoaded", () => { window.orbArenaApp = new App(); }, { once: true });
}());
