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
      document.querySelector(".result-summary").insertAdjacentHTML("afterend",`<section class="result-remaster panel"><div class="mvp-panel"></div><div class="award-panel"></div><div class="highlight-panel"></div><div class="roster-results"></div><div class="achievement-results"></div></section>`);
      document.querySelector(".result-actions").insertAdjacentHTML("beforeend",`<button class="button button-secondary" data-save-replay>SALVAR REPLAY</button><button class="button button-secondary" data-open-replays>ABRIR REPLAYS</button>`);
      document.querySelector("[data-save-replay]").onclick=()=>{const result=this.app.state.lastBattle;if(!result?.replay)return;const saved=this.app.storage.saveReplay(result.replay,`${result.mvp?.name||"Orb Arena"} · ${result.seed}`);this.app.toast(saved.ok?"Replay salvo.":"Falha ao salvar replay.");};document.querySelector("[data-open-replays]").onclick=()=>this.app.remasterUI.openReplays();
    }

    present(result) {
      const won = (result.winnerTeam||result.winner) === "player";
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
      this.renderRemaster(result);
    }

    renderRemaster(result){const root=document.querySelector(".result-remaster"),mvp=result.mvp||{},awards=result.awards||{};root.querySelector(".mvp-panel").innerHTML=`<small>MVP DA PARTIDA</small><h2>${mvp.name||"—"}</h2><strong>${mvp.score||0} PTS</strong>`;root.querySelector(".award-panel").innerHTML=Object.entries(awards).map(([key,value])=>`<div><small>${key.toUpperCase()}</small><b>${value}</b></div>`).join("");root.querySelector(".highlight-panel").innerHTML=(result.highlights||[]).map((item)=>`<article><small>${item.label}</small><b>${item.value}</b><span>${item.fighter||"—"}</span></article>`).join("");root.querySelector(".roster-results").innerHTML=`<h3>PLACAR COMPLETO</h3>${(result.roster||[]).map((fighter)=>`<div style="--team:${fighter.color}"><i></i><b>${fighter.name}</b><span>${fighter.teamName||fighter.teamId}</span><strong>${fighter.kills}/${fighter.assists}/${fighter.deaths}</strong><em>${Math.round(fighter.damageDealt||0)} dano</em></div>`).join("")}`;root.querySelector(".achievement-results").innerHTML=(result.newAchievements||[]).map((item)=>`<div><small>NOVA CONQUISTA</small><b>${item.name}</b><span>${item.description}</span></div>`).join("");}

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
