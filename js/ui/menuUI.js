(function () {
  "use strict";
  const OA = window.OrbArena;

  class MenuUI {
    constructor(app) {
      this.app = app;
      this.form = document.querySelector("#fighter-form");
      this.nameInput = document.querySelector("#fighter-name");
      this.colorInput = document.querySelector("#fighter-color");
      this.strokeInput = document.querySelector("#fighter-stroke");
      this.trailInput = document.querySelector("#fighter-trail");
      this.seedInput = document.querySelector("#seed-input");
      this.difficulty = document.querySelector("#difficulty-select");
      this.physicsPreset = document.querySelector("#physics-preset");
      this.previewOrb = document.querySelector("#preview-orb");
      this.bind();
      this.setSeed(OA.Random.createSeed());
      this.updatePreset("balanced");
      this.applyPhysicsPreset("pinball");
      this.updatePreview();
    }

    bind() {
      document.querySelector("#play-button").addEventListener("click", () => this.app.openCharacterSelect());
      document.querySelector("#quick-button").addEventListener("click", () => this.app.quickBattle());
      document.querySelectorAll("[data-action='play']").forEach((button) => button.addEventListener("click", () => this.app.openCharacterSelect()));
      document.querySelectorAll("[data-action='quick']").forEach((button) => button.addEventListener("click", () => this.app.quickBattle()));
      document.querySelectorAll("[data-module-screen]").forEach((button) => button.addEventListener("click", () => this.app.navigate(button.dataset.moduleScreen)));
      document.querySelectorAll("[data-modal]").forEach((button) => button.addEventListener("click", () => this.openModal(button.dataset.modal)));

      this.form.addEventListener("change", (event) => {
        if (event.target.name === "preset") this.updatePreset(event.target.value);
        if (event.target.id === "physics-preset") this.applyPhysicsPreset(event.target.value);
        this.updatePreview();
      });
      this.form.addEventListener("input", () => this.updatePreview());
      document.querySelector("#random-seed").addEventListener("click", () => this.setSeed(OA.Random.createSeed()));
      document.querySelector("#launch-button").addEventListener("click", () => this.launch());
      document.querySelectorAll("[data-physics]").forEach((input) => input.addEventListener("input", () => this.updatePhysicsOutput(input)));
      document.querySelector(".modal-close").addEventListener("click", () => document.querySelector("#info-modal").close());
      document.querySelector("#info-modal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      });
    }

    updatePreset(name) {
      const preset = OA.CONFIG.presets[name] || OA.CONFIG.presets.balanced;
      document.querySelectorAll(".preset-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input").value === name));
      const values = { health: preset.health, damage: preset.damage, speed: preset.speed, mass: preset.mass.toFixed(2) };
      const maxima = { health: 230, damage: 25, speed: 460, mass: 1.6 };
      for (const [stat, value] of Object.entries(values)) {
        document.querySelector(`[data-stat='${stat}']`).textContent = value;
        document.querySelector(`[data-stat-bar='${stat}']`).style.width = `${(Number(value) / maxima[stat]) * 100}%`;
      }
      document.querySelector("#battle-score").textContent = this.calculateScore(preset);
    }

    updatePreview() {
      this.previewOrb.style.background = `radial-gradient(circle at 35% 30%, #effeff, ${this.colorInput.value} 20%, #12324b 66%, #060a12)`;
      this.previewOrb.style.borderColor = this.strokeInput.value;
      this.previewOrb.style.boxShadow = `0 0 50px ${this.colorInput.value}55, inset -18px -18px 36px rgba(0,0,0,.6)`;
    }

    calculateScore(preset) {
      return Math.round(preset.health * 0.82 + preset.damage * 5.6 + preset.speed * 0.37 + preset.mass * 48 + preset.armor * 2.4);
    }

    getBuild() {
      const presetName = new FormData(this.form).get("preset") || "balanced";
      const preset = OA.CONFIG.presets[presetName];
      const safeName = this.nameInput.value.trim().replace(/[<>]/g, "").slice(0, 18) || "NEXUS-7";
      const character = OA.CharacterRegistry.get(this.app.state.settings.characterId) || OA.CharacterRegistry.get("echo");
      return {
        characterId: character.id,
        name: character.name || safeName,
        color: character.color,
        stroke: character.glow,
        trailColor: character.secondary,
        preset: presetName,
        gameModeId: document.querySelector("#game-mode-select")?.value || "orb",
        score: this.calculateScore(preset),
        stats: { ...preset }
      };
    }

    launch() {
      const seed = this.seedInput.value.trim() || OA.Random.createSeed();
      this.setSeed(seed);
      const build=this.getBuild();this.app.startBattle(build, this.difficulty.value, seed, this.getPhysicsSettings(), { gameModeId:build.gameModeId,arenaId: document.querySelector("#arena-select").value, durationPreset:document.querySelector("#duration-preset").value });
    }

    applyPhysicsPreset(id) {
      const preset = OA.getPhysicsPreset(id);
      document.querySelectorAll("[data-physics]").forEach((input) => {
        if (preset[input.dataset.physics] !== undefined) input.value = preset[input.dataset.physics];
        this.updatePhysicsOutput(input);
      });
    }

    updatePhysicsOutput(input) {
      const output = document.querySelector(`[data-output='${input.dataset.physics}']`);
      if (!output) return;
      const value = Number(input.value);
      output.value = Number.isInteger(value) ? String(value) : value.toFixed(input.dataset.physics === "collisionDamage" ? 3 : 2);
    }

    getPhysicsSettings() {
      const base = OA.getPhysicsPreset(this.physicsPreset.value);
      document.querySelectorAll("[data-physics]").forEach((input) => { base[input.dataset.physics] = Number(input.value); });
      base.name = OA.PHYSICS_PRESETS[this.physicsPreset.value].name;
      return base;
    }

    setSeed(seed) { this.seedInput.value = seed; }

    setBuild(build) {
      if (!build) return;
      this.nameInput.value = build.name;
      this.colorInput.value = build.color;
      this.strokeInput.value = build.stroke;
      this.trailInput.value = build.trailColor;
      if(document.querySelector("#game-mode-select"))document.querySelector("#game-mode-select").value=build.gameModeId||"orb";
      const radio = this.form.querySelector(`[name='preset'][value='${build.preset}']`);
      if (radio) radio.checked = true;
      this.updatePreset(build.preset);
      this.updatePreview();
    }

    updateRecord(record) {
      document.querySelector("#record-battles").textContent = record.battles;
      document.querySelector("#record-wins").textContent = record.wins;
      document.querySelector("#record-rate").textContent = record.rate === null ? "—" : `${record.rate}%`;
    }

    openModal(type) {
      const modal = document.querySelector("#info-modal");
      const content = document.querySelector("#modal-content");
      if (type === "roadmap") {
        const stages = [
          ["01", "Núcleo determinístico — disponível nesta versão"],
          ["02", "Física, armas, poderes, combos e arena — disponível"],
          ["03", "Habilidades, perks, builds e geração de inimigos"],
          ["04", "Arenas, status, elementos, IA e modos"],
          ["05", "Torneio, sobrevivência, progressão e compêndio"],
          ["06", "Áudio final, otimização, acessibilidade e polimento"]
        ];
        content.innerHTML = `<h2>ROTEIRO DO PROTOCOLO</h2><p>A fundação foi separada em seis entregas verificáveis. Cada etapa amplia contratos já existentes sem reescrever o núcleo.</p>${stages.map(([number, text]) => `<div class="modal-stage"><b>${number}</b><span>${text}</span></div>`).join("")}`;
      } else {
        content.innerHTML = `<h2>CRÉDITOS</h2><p class="credit-name">Duke Dandalian</p><p>Criado por Duke Dandalian<br>Desenvolvido por Duke Dandalian<br>Design por Duke Dandalian<br>Direção por Duke Dandalian<br>Conceito por Duke Dandalian</p><p>${OA.CREDITS.text}</p><p>Versão ${OA.VERSION}</p>`;
      }
      modal.showModal();
    }
  }

  OA.MenuUI = MenuUI;
}());
