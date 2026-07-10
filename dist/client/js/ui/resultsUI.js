(function () {
  "use strict";
  const OA = window.OrbArena;

  class ResultsUI {
    constructor(app) {
      this.app = app;
      document.querySelector("#result-menu").addEventListener("click", () => app.goHome());
      document.querySelector("#rematch-button").addEventListener("click", () => app.restartBattle());
      document.querySelector("#new-enemy").addEventListener("click", () => app.newEnemy());
      document.querySelector("#copy-seed").addEventListener("click", () => app.copySeed());
    }

    present(result) {
      const won = result.winner === "player";
      const title = document.querySelector("#results-title");
      title.textContent = won ? "VITÓRIA" : "DERROTA";
      title.className = won ? "victory" : "defeat";
      document.querySelector("#result-sigil").classList.toggle("defeat", !won);
      document.querySelector("#result-subtitle").textContent = won ? "O protocolo confirmou sua superioridade." : "O hostil rompeu sua sequência orbital.";
      document.querySelector("#result-player-name").textContent = result.player.name;
      document.querySelector("#result-enemy-name").textContent = result.enemy.name;
      this.paintOrb("#result-player-orb", result.player.color);
      this.paintOrb("#result-enemy-orb", result.enemy.color);
      document.querySelector("#result-duration").textContent = this.formatDuration(result.duration);
      document.querySelector("#result-damage").textContent = Math.round(result.player.damageDealt);
      document.querySelector("#result-received").textContent = Math.round(result.player.damageTaken);
      document.querySelector("#result-largest").textContent = Math.round(result.player.largestImpact);
      document.querySelector("#result-hits").textContent = result.player.hits;
      document.querySelector("#result-distance").textContent = `${(result.player.distance / 100).toFixed(1)} m`;
      document.querySelector("#result-collisions").textContent = result.player.collisionsMade;
      document.querySelector("#result-max-speed").textContent = Math.round(result.player.maxSpeed);
      document.querySelector("#result-wall-boosts").textContent = result.player.wallBoosts;
      document.querySelector("#result-knockback").textContent = Math.round(result.player.knockbackCaused);
      document.querySelector("#result-weapon-damage").textContent = Math.round(result.player.weaponDamage);
      document.querySelector("#result-ability-damage").textContent = Math.round(result.player.abilityDamage);
      document.querySelector("#result-combo").textContent = `${result.player.largestCombo}×`;
      document.querySelector("#result-power").textContent = result.player.mostUsedAbility;
      document.querySelector("#result-physics").textContent = result.physicsPreset;
      const character = result.player.characterTelemetry || {};
      document.querySelector("#result-character-active").textContent = Math.round(character.activeDamage || 0);
      document.querySelector("#result-character-ultimate").textContent = Math.round(character.ultimateDamage || 0);
      document.querySelector("#result-character-entities").textContent = `${character.clonesCreated || 0} / ${character.summonsCreated || 0}`;
      document.querySelector("#result-character-sustain").textContent = `${Math.round(character.healing || 0)} / ${Math.round(character.shieldGenerated || 0)}`;
      document.querySelector("#result-character-control").textContent = `${character.controlApplied || 0} · ${Number(character.timeSlowed || 0).toFixed(1)}s`;
      document.querySelector("#result-seed").textContent = result.seed;
    }

    paintOrb(selector, color) {
      const orb = document.querySelector(selector);
      orb.style.background = color;
      orb.style.color = color;
    }

    formatDuration(seconds) {
      const minutes = Math.floor(seconds / 60);
      const rest = (seconds % 60).toFixed(1).padStart(4, "0");
      return `${minutes}:${rest}`;
    }
  }

  OA.ResultsUI = ResultsUI;
}());
