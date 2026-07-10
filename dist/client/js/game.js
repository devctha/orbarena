(function () {
  "use strict";
  const OA = window.OrbArena;

  class Game {
    constructor(canvas, audio, callbacks) {
      this.canvas=canvas; this.audio=audio; this.callbacks=callbacks; this.world=null;
      this.loop=new OA.GameLoop((dt)=>this.update(dt),(alpha,realDelta)=>this.render(alpha,realDelta));
    }
    buildSystems(seed, physics) {
      this.random=new OA.Random(seed); this.logger=new OA.BattleLogger();
      const visual=OA.VISUAL_PRESETS[this.settings?.visualPreset||"balanced"]||OA.VISUAL_PRESETS.balanced;
      this.particles=new OA.ParticleManager(this.random,{quality:this.settings?.reducedParticles?"low":this.settings?.particleQuality||visual.particleQuality||this.settings?.quality||"high"});
      this.damageSystem=new OA.DamageSystem(this.particles,this.audio,this.logger);
      this.burstProtection=new OA.BurstProtectionSystem(); this.combat=new OA.CombatSystem(this.random,this.particles,this.audio,this.logger,this.burstProtection);
      this.projectiles=new OA.ProjectileSystem(this.random,this.combat,this.particles,this.audio,physics.id==="chaotic"||physics.id==="pinball"?160:128);
      this.arenaSystem=new OA.ArenaSystem(this.random,this.particles,this.audio); this.weaponSystem=new OA.WeaponSystem(this.random,this.projectiles,this.combat,this.particles,this.audio);
      this.perkSystem=new OA.PerkSystem(this.random,this.combat,this.projectiles,this.particles); this.comboSystem=new OA.ComboSystem(this.particles);
      this.abilitySystem=new OA.AbilitySystem(this.random,this.projectiles,this.combat,this.particles,this.audio,this.logger);this.abilityPresentationSystem=new OA.AbilityPresentationSystem(this.particles,this.audio); this.physics=new OA.PhysicsSystem(this.random,this.combat,this.projectiles);
      this.renderer=new OA.Renderer(this.canvas,this.particles,this.projectiles); this.renderer.settings=this.settings||{};
      this.balance=new OA.CharacterBalanceSystem(); this.matchups=new OA.MatchupSystem(); this.timeSystem=new OA.TimeSystem();
      this.summonSystem=new OA.SummonSystem(this.random,this.combat,this.projectiles,this.particles); this.abilitySystem.summonSystem=this.summonSystem;
      this.cloneSystem=new OA.CloneSystem(this.summonSystem,this.particles); this.poisonSystem=new OA.PoisonSystem(this.combat,this.particles); this.spikeSystem=new OA.SpikeSystem(this.combat,this.particles);
      this.powerSystem=new OA.PowerSystem(this.random,this.particles,this.audio);
      this.characterSystem=new OA.CharacterSystem({random:this.random,combat:this.combat,projectiles:this.projectiles,particles:this.particles,audio:this.audio,abilitySystem:this.abilitySystem,summons:this.summonSystem,clones:this.cloneSystem,poison:this.poisonSystem,spikes:this.spikeSystem,time:this.timeSystem,powers:this.powerSystem});
      this.teamSystem=new OA.TeamSystem(); this.controlSystem=new OA.ControlSystem(this.abilitySystem,this.characterSystem,this.audio); this.replaySystem=new OA.ReplaySystem(); this.metaGameSystem=new OA.MetaGameSystem();
      this.musicSystem=OA.MusicSystem?new OA.MusicSystem(this.audio):null; this.adaptivePerformance=new OA.AdaptivePerformanceSystem(this.settings||{}); this.cameraManager=new OA.CameraManager(this.settings||{});
    }
    start(build, difficultyKey, seed, physicsSettings=OA.getPhysicsPreset("arcade"), options={}) {
      this.stop();
      const match=OA.normalizeMatchConfig(options.matchConfig||{modeId:options.mode&&options.mode!=="duel"&&options.mode!=="lab"?options.mode:"1v1",arenaId:options.arenaId||build.arenaId,durationPreset:options.durationPreset||build.durationPreset,seed});
      seed=String(seed||match.seed); let physics={...OA.getPhysicsPreset(physicsSettings.id||"arcade"),...physicsSettings};
      const modifiers=match.modifiers.map((id)=>OA.MATCH_MODIFIERS.find((item)=>item.id===id)).filter(Boolean), values=Object.assign({},...modifiers.map((item)=>item.values));
      if(values.preset) physics={...OA.getPhysicsPreset(values.preset),...physics}; if(values.knockback) physics.knockback*=values.knockback; if(values.bounce) physics.globalElasticity*=values.bounce; if(values.wallBoost) physics.wallBoost*=values.wallBoost;
      if(this.settings?.screenShake===false||this.settings?.reducedMotion) physics.camera=0;
      this.buildSystems(seed,physics);
      const arenaSize=OA.ARENA_SIZES[match.arenaSize]||OA.ARENA_SIZES.small, arena=this.arenaSystem.create(physics.id,match.arenaId,arenaSize); this.renderer.resize(arena.width,arena.height);
      const difficulty=OA.CONFIG.difficulties[difficultyKey]||OA.CONFIG.difficulties.normal, pacing={...OA.getDurationPreset(match.durationPreset)};
      if(values.suddenScale){pacing.suddenDeathAt*=values.suddenScale;pacing.escalationEnd*=values.suddenScale;} if(values.timeScale) pacing.timeScale=values.timeScale;
      const rules={healing:values.healing??1,shields:values.shields??1,cooldown:values.cooldown||1,ultimates:values.ultimates!==false,hardcore:Boolean(values.hardcore),powerUps:values.powerUps||1,friendlyFire:match.friendlyFire};
      const world=this.world={seed,difficulty:difficultyKey,physics,match,rules,mode:options.mode||match.modeId,gameModeId:options.gameModeId||build.gameModeId||"orb",damageSystem:this.damageSystem,phase:"countdown",countdownRemaining:OA.CONFIG.battle.countdown,time:0,visualTime:0,intensity:1,suddenDeath:false,battlePhase:"opening",pacing,settings:this.settings||{},arena,arenaSystem:this.arenaSystem,teamSystem:this.teamSystem,controlSystem:this.controlSystem,presentationSystem:this.abilityPresentationSystem,events:[],zones:[],cinematicZones:[],characterZones:[],poisonPools:[],summons:[],effects:[],scheduled:[],killFeed:[],fighters:[],timeScales:{game:values.timeScale||1,visual:1,effect:1,animation:1,fighter:{},projectile:{},ability:{}},physicsStats:{substeps:1,collisions:0,lastImpact:0,lastNormal:null},camera:{trauma:0,zoom:1,cinematicZoom:0,shake:new OA.ScreenShakeManager(this.settings?.screenShake!==false&&!this.settings?.reducedMotion)},timeDilation:{scale:1,timer:0},logger:this.logger,finished:false,finishTimer:0,winner:null,countdownCue:3};
      world.gameMode=OA.GameModeRegistry.create(world.gameModeId);world.gameMode.setup(world);
      this.createRoster(world,build,options,difficulty,values);
      world.player=world.fighters.find((fighter)=>fighter.teamId==="player")||world.fighters[0]; world.enemy=world.fighters.find((fighter)=>fighter.teamId!==world.player.teamId)||world.fighters[1]; world.controlledFighter=world.player;
      for(const fighter of world.fighters){this.initializeFighter(world,fighter,fighter._build||{},fighter===world.player?build:{});world.gameMode.initializeFighter(world,fighter);}
      if(options.mode==="lab") for(const fighter of world.fighters.filter((item)=>item!==world.player)) fighter.ai.disabled=true;
      this.loop.accumulator=0; this.loop.setSpeed(1); this.loop.setTargetFps(this.settings?.targetFps||60); this.loop.setPaused(false); this.musicSystem?.setState?.("opening"); this.loop.start(); return world;
    }
    createRoster(world, build, options, difficulty, modifierValues) {
      const characters=OA.CharacterRegistry.all(), used=[];
      world.match.teams.forEach((team,teamIndex)=>{
        for(let slot=0;slot<team.size;slot+=1){
          const member=team.members[slot]||{}, primary=teamIndex===0&&slot===0, requested=world.mode==="mirror"?build.characterId:primary?build.characterId:member.characterId||(teamIndex===1&&slot===0?options.enemyCharacterId:null);
          let character=OA.CharacterRegistry.get(requested); if(!character) character=teamIndex===1&&slot===0?this.matchups.chooseEnemy(OA.CharacterRegistry.get(build.characterId)||characters[0],this.random,this.balance,world.difficulty):this.random.pick(characters.filter((item)=>!used.includes(item.id)).length?characters.filter((item)=>!used.includes(item.id)):characters);
          used.push(character.id); const spawn=this.teamSystem.spawn(teamIndex,slot,team.size,world.arena), angle=spawn.angle+this.random.range(-.16,.16), scale=teamIndex===0?1:difficulty.power;
          const fighter=OA.CharacterFactory.create(character,{id:`${team.id}-orb-${slot+1}`,team:team.id,x:spawn.x,y:spawn.y,vx:Math.cos(angle)*this.random.range(220,275),vy:Math.sin(angle)*this.random.range(220,275),orbit:this.random.sign(),phase:this.random.range(0,Math.PI*2),powerScale:scale});
          this.teamSystem.register(world,fighter,team,slot); fighter._build=primary?build:member.build||{}; if(world.mode==="boss"&&team.size===1){fighter.maxHealth*=2.6;fighter.health=fighter.maxHealth;fighter.damage*=1.35;fighter.mass*=1.35;fighter.baseMass=fighter.mass;}if(modifierValues.speed) fighter.maxSpeed*=modifierValues.speed; if(modifierValues.ultimate!==undefined) fighter._initialUltimate=modifierValues.ultimate;
          world.fighters.push(fighter);
        }
      });
    }
    initializeFighter(world,fighter,memberBuild,primaryBuild) {
      fighter.world=world;
      const character=OA.CharacterRegistry.get(fighter.characterId), loadout=Object.keys(memberBuild).length?memberBuild:primaryBuild;
      this.weaponSystem.equip(fighter,loadout.weaponId||character.preferredWeapon); this.perkSystem.assign(fighter,fighter.weapon,loadout.perks); this.abilitySystem.assign(fighter,fighter.weapon,loadout.abilities);
      fighter.buildPowers={...(loadout.abilities||{})}; fighter.equippedPowerIds=[...new Set(Object.values(fighter.buildPowers).filter((id)=>OA.PowerRegistry.get(id)))];
      this.comboSystem.initialize(fighter); this.burstProtection.initialize(fighter); this.characterSystem.initialize(world,fighter);
      if(fighter._initialUltimate!==undefined&&fighter.characterState) fighter.characterState.ultimateCharge=fighter._initialUltimate;
      const requested=fighter===world.player?(loadout.controlMode||this.settings?.controlMode||"AUTO"):"AUTO"; this.controlSystem.initialize(fighter,{controlMode:requested,autoCast:loadout.autoCast,keybinds:this.settings?.keybinds});if(requested!=="AUTO")for(const id of Object.keys(fighter.abilityCooldowns))fighter.abilityCooldowns[id]=0;
      for(const state of Object.values(fighter.abilityState||{}))state.recharge*=world.rules.cooldown;
      const heal=fighter.heal.bind(fighter),shield=fighter.addShield.bind(fighter);fighter.heal=(amount)=>heal(amount*world.rules.healing);fighter.addShield=(amount)=>shield(amount*world.rules.shields);
      world.timeScales.fighter[fighter.team]=world.timeScales.fighter[fighter.team]||1; world.timeScales.projectile[fighter.team]=world.timeScales.projectile[fighter.team]||1; world.timeScales.ability[fighter.team]=world.timeScales.ability[fighter.team]||1;
    }
    update(dt) {
      const w=this.world; if(!w||w.finished) return;
      w.camera.shake?.update(dt); w.camera.trauma=Math.max(w.camera.shake?.trauma||0,Math.max(0,w.camera.trauma-dt*2.8)); this.cameraManager?.update(w,dt);
      if(w.timeDilation.timer>0) w.timeDilation.timer-=dt; else w.timeDilation.scale=1; this.timeSystem.update(w,dt); const simDt=dt*w.timeDilation.scale*w.timeScales.game;
      if(w.phase==="countdown"){w.countdownRemaining-=dt;const cue=Math.max(0,Math.ceil(w.countdownRemaining));if(cue!==w.countdownCue){w.countdownCue=cue;this.audio.countdown(cue);}if(w.countdownRemaining<=0)w.phase="active";return;}
      if(w.phase==="active"){
        w.time+=simDt; w.battlePhase=w.time<w.pacing.openingEnd?"opening":w.time<w.pacing.escalationEnd?"escalation":w.time<w.pacing.suddenDeathAt?"climax":"suddenDeath"; w.intensity={opening:.9,escalation:1.05,climax:1.2,suddenDeath:Math.min(1.58,1.28+(w.time-w.pacing.suddenDeathAt)*.008)}[w.battlePhase]; w.suddenDeath=w.time>=w.pacing.suddenDeathAt;
        this.musicSystem?.setState?.(w.battlePhase);this.musicSystem?.update?.(w,simDt); this.arenaSystem.update(w,simDt); this.controlSystem.update(w,simDt);this.abilityPresentationSystem.update(w,simDt); this.characterSystem.update(w,simDt); this.summonSystem.update(w,simDt); this.cloneSystem.update(w,simDt); this.poisonSystem.update(w,simDt);
        for(const fighter of w.fighters) this.spikeSystem.update(fighter,simDt*(w.timeScales.fighter[fighter.team]||1));
        this.abilitySystem.update(w,simDt); this.perkSystem.update(w,simDt); this.weaponSystem.update(w,simDt); this.physics.update(w,simDt); w.gameMode.update(w,simDt,{combat:this.combat,particles:this.particles,audio:this.audio,projectiles:this.projectiles,random:this.random});for(const fighter of w.fighters)if(fighter.stick&&!Array.isArray(fighter.combo?.sequence))fighter.combo={count:fighter.stick.combo,multiplier:Math.max(.35,1-(fighter.stick.combo-1)*.055),timer:fighter.stick.comboTimer,sequence:[],label:fighter.stick.combo>=2?`${fighter.stick.combo} HITS`:""};this.projectiles.update(w,simDt); this.comboSystem.update(w,simDt); this.burstProtection.update(w,simDt); this.particles.update(simDt*(w.timeScales.effect||1)); this.replaySystem.capture(w,simDt);
        const events=w.events.splice(0); this.perkSystem.process(w,events); this.comboSystem.process(w,events); this.abilitySystem.processEvents(w,events); this.characterSystem.processEvents(w,events);
        const winner=this.teamSystem.winner(w);
        if(w.mode==="lab"&&winner){for(const fighter of w.fighters){if(!fighter.alive){fighter.alive=true;fighter.isDead=false;fighter.deathHandled=false;fighter.health=fighter.maxHealth;fighter.shield=0;fighter.hitRegistry.clear();const spawn=this.teamSystem.spawn(w.match.teams.findIndex((team)=>team.id===fighter.teamId),fighter.slot,w.match.teams.find((team)=>team.id===fighter.teamId)?.size||1,w.arena);fighter.x=spawn.x;fighter.y=spawn.y;fighter.vx=fighter.vy=0;fighter._eliminationRecorded=false;}}}
        else if(winner) this.beginFinish(winner); else if(w.time>=w.pacing.timeLimit) this.beginFinish(this.healthLeader(w)); return;
      }
      if(w.phase==="ending"){w.finishTimer-=dt;this.particles.update(dt*.35);if(w.finishTimer<=0)this.finish();}
    }
    healthLeader(world){const scores=new Map();for(const fighter of world.fighters)scores.set(fighter.teamId,(scores.get(fighter.teamId)||0)+Math.max(0,fighter.healthRatio())+(fighter.kills||0)*.25);return[...scores].sort((a,b)=>b[1]-a[1])[0]?.[0]||"draw";}
    beginFinish(winner){if(this.world.phase==="ending")return;this.world.phase="ending";this.world.winner=winner;this.world.finishTimer=1.25;this.world.timeDilation={scale:.22,timer:.8};this.world.camera.trauma=.9;this.world.camera.shake?.add(1,.55,24,"critical");const won=winner==="player";this.musicSystem?.setState?.(won?"victory":"defeat");won?this.audio.victory():this.audio.defeat();}
    finish(){if(this.world.finished)return;this.world.finished=true;const replay=this.replaySystem.finalize(this.world),base=this.logger.buildResult(this.world,this.world.winner),result=this.metaGameSystem.enrich(this.world,base,replay);this.loop.stop();this.callbacks.onComplete(result);}
    render(alpha,realDelta){if(!this.world)return;this.world.visualTime+=realDelta*(this.world.timeScales?.animation||this.world.timeScales?.visual||1);this.renderer.render(this.world,alpha);this.adaptivePerformance?.update(this.loop.fps,realDelta,this.particles);this.world.performanceLevel=this.adaptivePerformance?.level||0;for(const fighter of this.world.fighters){fighter.telemetry.minFps=Math.min(fighter.telemetry.minFps||60,this.loop.fps);fighter.telemetry.particlesEmitted=this.particles.emitted;fighter.telemetry.peakParticles=this.particles.peak;}this.callbacks.onFrame(this.world,this.loop,this.particles.activeCount+this.projectiles.activeCount);}
    cast(slot,targetHint){return this.controlSystem?.request(this.world,this.world?.controlledFighter,slot,targetHint);}
    selectControlledFighter(id){const fighter=this.world?.fighters.find((item)=>item.id===id&&item.teamId==="player");if(fighter)this.world.controlledFighter=fighter;return fighter||null;}
    toggleAutoCast(abilityId){return this.world?.controlledFighter?this.controlSystem.toggleAutoCast(this.world.controlledFighter,abilityId):false;}
    setPaused(paused,source){this.loop.setPaused(paused,source);} togglePause(){this.loop.setPaused(!this.loop.paused);return this.loop.paused;} setSpeed(speed){this.loop.setSpeed(speed);} setHitboxes(enabled){if(this.renderer)this.renderer.hitboxes=enabled;} setDebug(enabled){if(this.renderer)this.renderer.debug=enabled;}
    lab(action){const w=this.world,f=w?.controlledFighter||w?.player,t=f&&OA.findTarget(w,f);if(!w||w.mode!=="lab"||!f)return;if(action==="heal")f.heal(f.maxHealth);if(action==="damage10")w.damageSystem.apply(w,f,{sourceId:"debug",sourceType:"lab",baseDamage:10,ignoreArmor:true});if(action==="damage100")w.damageSystem.apply(w,f,{sourceId:"debug-heavy",sourceType:"lab",baseDamage:100,ignoreArmor:true,tags:["ultimate"]});if(action==="zeroHealth")w.damageSystem.apply(w,f,{sourceId:"debug-ko",sourceType:"lab",baseDamage:999,ignoreArmor:true,tags:["ultimate"]});if(action==="shield")f.addShield(50);if(action==="poison"&&t)this.poisonSystem.apply(t,f,4,8,2);if(action==="fire"&&t)t.burn={source:f,timer:6,tick:0,damage:2.5};if(action==="stun"&&t)t.setStatus("stunned",1,1);if(action==="reset"){for(const id of Object.keys(f.abilityCooldowns))f.abilityCooldowns[id]=0;for(const state of Object.values(f.abilityState||{})){state.charges=state.maxCharges;state.rechargeTimer=0;}f.characterState.activeCooldown=0;}if(action==="skill"&&t)this.abilitySystem.use(w,f,t,f.abilities[0]);if(action==="ultimate"&&t){f.characterState.ultimateCharge=100;this.characterSystem.useUltimate(w,f,t,OA.CharacterMechanics.get(f.characterId));}if(action==="clone")this.cloneSystem.create(w,f,{life:12});if(action==="projectiles"&&t)this.characterSystem.burst(w,f,t,{radial:true,count:12,damage:6,bounces:2,color:f.glowColor});if(action==="time"&&t)this.timeSystem.slowFighter(t.team,.25,5,f);}
    stop(){this.loop.stop();this.musicSystem?.stop?.();}
  }
  OA.Game=Game;
}());
