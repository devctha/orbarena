(function () {
  "use strict";
  const OA = window.OrbArena;

  class BattleUI {
    constructor(app) {
      this.app = app;
      this.timer = document.querySelector("#battle-timer");
      this.countdown = document.querySelector("#countdown");
      this.pauseOverlay = document.querySelector("#paused-overlay");
      this.debugPanel = document.querySelector("#debug-panel");
      this.lastHudUpdate = 0;
      document.querySelector(".arena-shell").insertAdjacentHTML("afterend", `<div class="team-rosters"></div><div class="combat-skillbar panel"></div><div class="kill-feed" aria-live="polite"></div>`);
      this.skillbar=document.querySelector(".combat-skillbar");this.teamRosters=document.querySelector(".team-rosters");this.killFeed=document.querySelector(".kill-feed");
      this.bind();
    }

    bind() {
      document.querySelector("#battle-exit").addEventListener("click", () => this.app.goHome());
      document.querySelector("#pause-button").addEventListener("click", () => this.app.togglePause());
      document.querySelector("#restart-button").addEventListener("click", () => this.app.restartBattle());
      document.querySelector("#hitbox-button").addEventListener("click", (event) => {
        const active = this.app.toggleHitboxes();
        event.currentTarget.classList.toggle("active", active);
      });
      document.querySelector("#debug-button").addEventListener("click", (event) => {
        const active = this.app.toggleDebug();
        event.currentTarget.classList.toggle("active", active);
        this.debugPanel.classList.toggle("visible", active);
      });
      document.querySelectorAll("[data-speed]").forEach((button) => button.addEventListener("click", () => {
        const speed = Number(button.dataset.speed);
        this.app.setSpeed(speed);
        document.querySelectorAll("[data-speed]").forEach((item) => item.classList.toggle("active", item === button));
      }));
      document.querySelectorAll("[data-lab]").forEach((button) => button.addEventListener("click", () => this.app.game.lab(button.dataset.lab)));
      document.querySelector("#arena-canvas").addEventListener("pointerdown",(event)=>{const world=this.app.game.world,fighter=world?.controlledFighter;if(!world||!fighter)return;const rect=event.currentTarget.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*world.arena.width,y=(event.clientY-rect.top)/rect.height*world.arena.height,candidates=world.teamSystem.enemies(world,fighter);candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));this.targetHint={fighter:candidates[0],x,y};if(candidates[0])this.app.toast(`Alvo: ${candidates[0].name}`);});
      document.addEventListener("keydown", (event) => {
        if (!document.querySelector("#screen-battle").classList.contains("active")) return;
        if (event.code === "Space") { event.preventDefault(); this.app.togglePause(); }
        if (event.key.toLowerCase() === "h") document.querySelector("#hitbox-button").click();
        if (event.key.toLowerCase() === "d") document.querySelector("#debug-button").click();
        const fighter=this.app.game.world?.controlledFighter,key=event.key.toLowerCase(),binding=Object.entries(fighter?.keybinds||{}).find(([,value])=>value===key)?.[0],slot=binding==="ultimate"?"ultimate":binding?.startsWith("skill")?Number(binding.slice(-1))-1:{q:0,w:1,e:2,r:3,f:"ultimate"}[key];if(slot!==undefined&&!event.repeat){event.preventDefault();const response=this.app.game.cast(slot,this.targetHint);if(response&&!response.ok)this.app.toast(response.reason||"Ação indisponível.");}
      });
      this.skillbar.addEventListener("click",(event)=>{const auto=event.target.closest("[data-autocast]");if(auto){event.stopPropagation();this.app.game.toggleAutoCast(auto.dataset.autocast);return;}const cast=event.target.closest("[data-cast]");if(cast)this.app.game.cast(cast.dataset.cast==="ultimate"?"ultimate":+cast.dataset.cast,this.targetHint);});
    }

    present(world, difficultyLabel) {
      document.querySelector("#battle-mode").textContent = `${world.mode === "lab" ? "CHARACTER LAB" : world.match?.label||world.mode} // ${difficultyLabel.toUpperCase()}`;
      document.querySelector("#battle-seed").textContent = `SEED ${world.seed}`;
      document.querySelector("#player-name-hud").textContent = world.player.name;
      document.querySelector("#enemy-name-hud").textContent = world.enemy.name;
      this.setDot("#player-dot", world.player);
      this.setDot("#enemy-dot", world.enemy);
      document.querySelector("#player-weapon").textContent = world.player.weapon.name;
      document.querySelector("#enemy-weapon").textContent = world.enemy.weapon.name;
      document.querySelector("#player-abilities").textContent = [world.player.character?.kit.active, world.player.character?.kit.ultimate, ...world.player.abilities.map((ability) => ability.name)].filter(Boolean).join(" · ");
      document.querySelector("#enemy-abilities").textContent = [world.enemy.character?.kit.active, world.enemy.character?.kit.ultimate, ...world.enemy.abilities.map((ability) => ability.name)].filter(Boolean).join(" · ");
      this.setSpeedButton(1);
      this.setPaused(false);
      this.renderRosters(world);this.renderSkills(world);
      this.update(world, { fps: 60 }, 0, true);
    }

    setDot(selector, fighter) {
      const dot = document.querySelector(selector);
      dot.style.background = fighter.color;
      dot.style.borderColor = fighter.stroke;
      dot.style.color = fighter.color;
    }

    update(world, loop, particleCount, force = false) {
      const now = performance.now();
      if (!force && now - this.lastHudUpdate < 45) return;
      this.lastHudUpdate = now;
      this.timer.textContent = this.formatTime(world.time);
      this.updateFighterHud("player", world.player);
      this.updateFighterHud("enemy", world.enemy);
      this.updateCombo("player", world.player);
      this.updateCombo("enemy", world.enemy);
      this.renderRosters(world);this.renderSkills(world);this.renderKillFeed(world);
      const phaseLabels={opening:"ABERTURA",escalation:"ESCALADA",climax:"CLÍMAX",suddenDeath:"MORTE SÚBITA"},intensityLevel=phaseLabels[world.battlePhase]||"ABERTURA";
      document.querySelector("#intensity-indicator").textContent = `${intensityLevel} · ${world.physics.name.toUpperCase()}`;
      const phaseBadge=document.querySelector("#battle-phase-badge");phaseBadge.textContent=intensityLevel;phaseBadge.dataset.phase=world.battlePhase;

      if (world.phase === "countdown") {
        const value = Math.ceil(world.countdownRemaining);
        this.countdown.textContent = value > 0 ? value : "LUTE";
        this.countdown.classList.add("visible");
      } else {
        this.countdown.classList.remove("visible");
      }

      if (this.app.state.settings.debug) {
        this.debugPanel.textContent = [
          `FPS       ${Math.round(loop.fps)}`,
          `FASE      ${world.phase.toUpperCase()}`,
          `ENTIDADES ${OA.getFighters(world).length}`,
          `FX/PROJ   ${particleCount}`,
          `SUBSTEPS  ${world.physicsStats.substeps}`,
          `COLISÕES  ${world.physicsStats.collisions}`,
          `IMPACTO   ${world.physicsStats.lastImpact.toFixed(1)}`,
          `SEED      ${world.seed}`,
          `IA P1     ${world.player.ai.style}`,
          `IA CPU    ${world.enemy.ai.style}`,
          `VEL P1    ${Math.round(Math.hypot(world.player.vx, world.player.vy))}`,
          `VEL CPU   ${Math.round(world.enemy.currentSpeed())}`,
          `MASSA P1  ${world.player.mass.toFixed(2)}`,
          `MASSA CPU ${world.enemy.mass.toFixed(2)}`,
          `A P1      ${Math.round(Math.hypot(world.player.ax, world.player.ay))}`,
          `WALL P1   ${world.player.telemetry.wallBounces}`,
          `LOGS      ${world.logger.entries.length}`
        ].join("\n");
      }
    }

    renderRosters(world){const teams=world.match?.teams||[];this.teamRosters.innerHTML=teams.map((team)=>`<article style="--team:${team.color}"><header><b>${team.emblem||"◇"} ${team.label}</b><span>${world.objective?`${Math.floor(world.objective.scores[team.id]||0)}/${world.match.scoreLimit} · `:""}${world.fighters.filter((f)=>f.teamId===team.id&&f.alive).length}/${world.fighters.filter((f)=>f.teamId===team.id).length}</span></header>${world.fighters.filter((f)=>f.teamId===team.id).map((f)=>`<button class="${f===world.controlledFighter?"controlled":""} ${f.alive?"":"down"}" data-fighter="${f.id}" style="--hp:${f.healthRatio()*100}%"><i></i><span>${f.name}</span><small>${f.kills||0}/${f.assists||0}/${f.deaths||0}</small></button>`).join("")}</article>`).join("");this.teamRosters.querySelectorAll("[data-fighter]").forEach((button)=>button.onclick=()=>this.app.game.selectControlledFighter(button.dataset.fighter));}
    renderSkills(world){const fighter=world.controlledFighter||world.player;if(!fighter)return;const cards=fighter.abilities.map((ability,index)=>{const state=fighter.abilityState?.[ability.id],cooldown=fighter.abilityCooldowns[ability.id]||0,ready=(state?.charges??1)>0&&cooldown<=0&&!fighter.castQueue,auto=fighter.autoCast?.[ability.id];return `<button class="skill-card ${ready?"ready":"cooling"}" data-cast="${index}" style="--skill:${ability.color};--cool:${Math.min(100,cooldown/Math.max(.1,ability.cooldown)*100)}%"><kbd>${["Q","W","E","R"][index]}</kbd><small>${ability.category}</small><b>${ability.name}</b><span>${state?.casting>0?`CAST ${state.casting.toFixed(1)}`:cooldown>0?cooldown.toFixed(1):"PRONTA"}</span><em>${state?.charges??1}/${state?.maxCharges??1}</em><i data-autocast="${ability.id}" class="${auto?"on":""}">AUTO</i></button>`;}).join("");const ultimate=fighter.character?.kit.ultimate||"Ultimate",charge=Math.round(fighter.characterState?.ultimateCharge||0);this.skillbar.innerHTML=`<div class="skillbar-ident"><span>${fighter.controlMode}</span><b>${fighter.name}</b></div>${cards}<button class="skill-card ultimate-card ${charge>=100?"ready":"cooling"}" data-cast="ultimate"><kbd>F</kbd><small>ULTIMATE</small><b>${ultimate}</b><span>${charge}%</span></button>`;}
    renderKillFeed(world){this.killFeed.innerHTML=(world.killFeed||[]).slice(0,5).map((entry)=>`<div><b>${entry.killerName}</b><span>${entry.abilityId||entry.source}</span><strong>${entry.victimName}</strong>${entry.assists.length?`<small>+ ${entry.assists.join(", ")}</small>`:""}</div>`).join("");}

    updateFighterHud(prefix, fighter) {
      const health = Math.ceil(fighter.health);
      const shield = fighter.shield > 0 ? ` +${Math.ceil(fighter.shield)}` : "";
      document.querySelector(`#${prefix}-hp-text`).textContent = `${health} / ${Math.round(fighter.maxHealth)}${shield}`;
      document.querySelector(`#${prefix}-health-bar`).style.width = `${fighter.healthRatio() * 100}%`;
      const systems=document.querySelector(`#${prefix}-systems`),ultimate=Math.round(fighter.characterState?.ultimateCharge||0),burst=fighter.burstProtection?.active>0?"BURST PROTECTION":"",power=fighter.wallBoostTimer>0?"WALL BOOST":fighter.status.haste>0?"VELOCIDADE":"";systems.innerHTML=`<span>ULT ${ultimate}%</span>${fighter.shield>0?`<span>ESCUDO ${Math.ceil(fighter.shield)}</span>`:""}${burst?`<b>${burst}</b>`:""}${power?`<em>${power}</em>`:""}`;
    }

    updateCombo(prefix, fighter) {
      const element = document.querySelector(`#${prefix}-combo`);
      const visible = fighter.combo?.count >= 2;
      element.textContent = visible ? `${fighter.combo.label || `${fighter.combo.count}× COMBO`}  ×${fighter.combo.multiplier.toFixed(2)}` : "";
      element.classList.toggle("visible", visible);
    }

    setPaused(paused) {
      this.pauseOverlay.classList.toggle("visible", paused);
      const button = document.querySelector("#pause-button");
      button.innerHTML = paused ? "<span>▶</span> CONTINUAR" : "<span>Ⅱ</span> PAUSAR";
      button.classList.toggle("active", paused);
    }

    setSpeedButton(speed) {
      document.querySelectorAll("[data-speed]").forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === speed));
    }

    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
      const rest = (seconds % 60).toFixed(1).padStart(4, "0");
      return `${minutes}:${rest}`;
    }
  }

  OA.BattleUI = BattleUI;
}());
