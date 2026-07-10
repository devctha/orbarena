(function () {
  "use strict";
  const OA = window.OrbArena;

  class Renderer {
    constructor(canvas, particles, projectileSystem) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d", { alpha: false });
      this.particles = particles;
      this.projectiles = projectileSystem;
      this.width = OA.CONFIG.arena.width;
      this.height = OA.CONFIG.arena.height;
      this.hitboxes = false;
      this.debug = false;
      this.displayFont = '"Barlow Condensed", "Arial Narrow", sans-serif';
      this.arenaCache = new Map();
      this.fighterSpriteCache = new Map();
      this.performanceLevel = 0;
      this.configureCanvas();
    }

    configureCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.width * ratio;
      this.canvas.height = this.height * ratio;
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.context.imageSmoothingEnabled = true;
    }

    createSurface(width, height) {
      if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
      const surface = document.createElement("canvas"); surface.width = width; surface.height = height; return surface;
    }

    rectangularFloor(colors, padding, suddenDeath) {
      const key = `${colors.floor}|${colors.ring}|${padding}|${suddenDeath ? 1 : 0}`;
      if (this.arenaCache.has(key)) return this.arenaCache.get(key);
      const surface = this.createSurface(this.width, this.height), context = surface.getContext("2d", { alpha: false });
      context.fillStyle = "#02050a"; context.fillRect(0, 0, this.width, this.height);
      const floor = context.createLinearGradient(0, 0, this.width, this.height);
      floor.addColorStop(0, suddenDeath ? "#1d101a" : colors.floor); floor.addColorStop(1, "#03070c");
      context.fillStyle = floor; context.fillRect(padding, padding, this.width - padding * 2, this.height - padding * 2);
      context.save(); context.beginPath(); context.rect(padding, padding, this.width - padding * 2, this.height - padding * 2); context.clip();
      context.strokeStyle = "rgba(90,180,200,.08)"; context.lineWidth = 1;
      for (let x = padding; x <= this.width - padding; x += 48) { context.beginPath(); context.moveTo(x, padding); context.lineTo(x, this.height - padding); context.stroke(); }
      for (let y = padding; y <= this.height - padding; y += 48) { context.beginPath(); context.moveTo(padding, y); context.lineTo(this.width - padding, y); context.stroke(); }
      context.strokeStyle = this.hexToRgba(colors.ring, 0.12); context.beginPath(); context.moveTo(this.width / 2, padding); context.lineTo(this.width / 2, this.height - padding); context.stroke(); context.restore();
      this.arenaCache.set(key, surface); if (this.arenaCache.size > 8) this.arenaCache.delete(this.arenaCache.keys().next().value); return surface;
    }

    fighterSprite(fighter, radius) {
      const bright = fighter.deform.flash > 0.35, key = `${fighter.color}|${fighter.stroke}|${radius}|${bright ? 1 : 0}`;
      if (this.fighterSpriteCache.has(key)) return this.fighterSpriteCache.get(key);
      const pad = 5, logical = (radius + pad) * 2, ratio = 2, surface = this.createSurface(Math.ceil(logical * ratio), Math.ceil(logical * ratio)), context = surface.getContext("2d");
      context.scale(ratio, ratio); const center = logical / 2;
      const gradient = context.createRadialGradient(center - radius * .32, center - radius * .38, radius * .05, center, center, radius);
      gradient.addColorStop(0, "#f4ffff"); gradient.addColorStop(.14, fighter.stroke); gradient.addColorStop(.4, bright ? "#ffffff" : fighter.color); gradient.addColorStop(1, "#07101c");
      context.fillStyle = gradient; context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fill();
      const sprite = { surface, logical, offset: logical / 2 }; this.fighterSpriteCache.set(key, sprite); if (this.fighterSpriteCache.size > 128) this.fighterSpriteCache.delete(this.fighterSpriteCache.keys().next().value); return sprite;
    }

    render(world, alpha) {
      const context = this.context;
      const distance = Math.hypot(world.player.x - world.enemy.x, world.player.y - world.enemy.y);
      this.performanceLevel = world.performanceLevel || 0;
      const peakSpeed=Math.max(world.player.currentSpeed(),world.enemy.currentSpeed()),zoomTarget = this.settings?.reducedMotion ? 1 : OA.clamp(1.04 - distance / 5400-peakSpeed/26000 + world.camera.trauma * 0.025-(world.camera.cinematicZoom||0), 0.89, 1.07);
      world.camera.zoom += (zoomTarget - world.camera.zoom) * 0.08;
      const trauma = this.settings?.reducedMotion ? 0 : world.camera.trauma * world.physics.camera;
      const shakeX = Math.sin(world.visualTime * 91) * trauma * 8 + Math.sin(world.visualTime * 37) * this.particles.shake * 0.35;
      const shakeY = Math.cos(world.visualTime * 77) * trauma * 8 + Math.cos(world.visualTime * 43) * this.particles.shake * 0.35;

      context.save();
      context.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
      context.scale(world.camera.zoom, world.camera.zoom);
      context.translate(-this.width / 2, -this.height / 2);
      this.drawArena(context, world);
      this.drawDecals(context,world);
      this.drawZones(context, world);
      this.drawTrail(context, world.player);
      this.drawTrail(context, world.enemy);
      this.drawEffects(context, world);
      this.drawProjectiles(context);
      this.drawSummons(context, world);
      if (world.player.alive) this.drawFighter(context, world.player, alpha, world.visualTime);
      if (world.enemy.alive) this.drawFighter(context, world.enemy, alpha, world.visualTime);
      this.drawParticles(context);
      this.drawWaves(context);
      this.drawLightning(context);
      this.drawDamageText(context);
      if (this.debug) this.drawDebug(context, world);
      context.restore();

      if (this.particles.flash > 0 && !this.settings?.reducedFlashes) {
        context.fillStyle = `rgba(194, 250, 255, ${this.particles.flash * 0.1})`;
        context.fillRect(0, 0, this.width, this.height);
      }
      if (world.suddenDeath) this.drawSuddenDeath(context, world.visualTime);
    }

    drawArena(context, world) {
      const arena=world.arena,cx=arena.centerX||this.width/2,cy=arena.centerY||this.height/2,r=arena.radius||230,colors=arena.colors||{floor:"#08141f",ring:"#44e7f4",core:"#7656b6"};
      if (arena.shape !== "circle") return this.drawRectangularArena(context, world, colors);
      context.fillStyle="#02050a";context.fillRect(-30,-30,this.width+60,this.height+60);
      context.save();context.shadowColor=colors.ring;context.shadowBlur=28;context.fillStyle="#07101a";context.beginPath();context.arc(cx,cy,r+18,0,Math.PI*2);context.fill();context.shadowBlur=0;
      context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.clip();
      const floor=context.createRadialGradient(cx,cy,10,cx,cy,r);floor.addColorStop(0,world.suddenDeath?"#21111d":colors.floor);floor.addColorStop(.68,"#08111b");floor.addColorStop(1,"#03070c");context.fillStyle=floor;context.fillRect(cx-r,cy-r,r*2,r*2);
      context.strokeStyle="rgba(90,180,200,.07)";context.lineWidth=1;for(let x=cx-r;x<cx+r;x+=36){context.beginPath();context.moveTo(x,cy-r);context.lineTo(x,cy+r);context.stroke();}for(let y=cy-r;y<cy+r;y+=36){context.beginPath();context.moveTo(cx-r,y);context.lineTo(cx+r,y);context.stroke();}
      context.strokeStyle=this.hexToRgba(colors.ring,.12);for(const radius of [r*.38,r*.68,r*.88]){context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.stroke();}
      const core=context.createRadialGradient(cx-12,cy-12,4,cx,cy,arena.innerRadius||70);core.addColorStop(0,"#f2ffff");core.addColorStop(.15,colors.core);core.addColorStop(1,"rgba(30,30,65,.15)");context.fillStyle=core;context.shadowColor=colors.core;context.shadowBlur=18;context.beginPath();context.arc(cx,cy,arena.innerRadius||70,0,Math.PI*2);context.fill();context.shadowBlur=0;
      for(const platform of arena.platforms||[]){context.fillStyle="rgba(22,35,48,.92)";context.strokeStyle=this.hexToRgba(colors.ring,.34);context.lineWidth=2;context.beginPath();context.arc(platform.x,platform.y,platform.radius+8,0,Math.PI*2);context.fill();context.stroke();context.fillStyle="rgba(90,170,185,.08)";context.beginPath();context.arc(platform.x,platform.y,platform.radius-3,0,Math.PI*2);context.fill();}
      for(const zone of arena.speedZones||[]){const pulse=.7+Math.sin(world.visualTime*5+zone.x)*.15;context.fillStyle=`rgba(68,231,244,${.035*pulse})`;context.strokeStyle=`rgba(68,231,244,${.22*pulse})`;context.setLineDash([5,8]);context.beginPath();context.arc(zone.x,zone.y,zone.radius,0,Math.PI*2);context.fill();context.stroke();context.setLineDash([]);}
      for(const powerUp of arena.powerUps||[])if(powerUp.active){context.fillStyle={heal:"#74e69a",haste:"#f2cf65",shield:"#69c9ff",ultimate:"#ba79ef"}[powerUp.kind];context.shadowColor=context.fillStyle;context.shadowBlur=12;context.beginPath();context.arc(powerUp.x,powerUp.y,powerUp.radius,0,Math.PI*2);context.fill();context.shadowBlur=0;}
      for(const portal of arena.portals||[]){context.strokeStyle="#a176f5";context.lineWidth=3;context.beginPath();context.arc(portal.x,portal.y,portal.radius,0,Math.PI*2);context.stroke();}
      context.restore();context.save();context.strokeStyle=world.suddenDeath?"#ff627f":this.hexToRgba(colors.ring,.72);context.lineWidth=world.suddenDeath?5:3;context.shadowColor=world.suddenDeath?"#ff5277":colors.ring;context.shadowBlur=world.suddenDeath?16:8;context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.stroke();context.globalAlpha=.45;context.lineWidth=8;context.beginPath();context.arc(cx,cy,r+13,0,Math.PI*2);context.stroke();context.restore();
    }

    drawRectangularArena(context, world, colors) {
      const padding = (world.arena.padding || OA.CONFIG.arena.padding)+(world.arena.inset||0);
      context.drawImage(this.rectangularFloor(colors, padding, world.suddenDeath), 0, 0, this.width, this.height);
      context.save(); context.beginPath(); context.rect(padding, padding, this.width - padding * 2, this.height - padding * 2); context.clip();
      for (const zone of world.arena.speedZones || []) { context.fillStyle = "rgba(68,231,244,.04)"; context.strokeStyle = "rgba(68,231,244,.25)"; context.setLineDash([6, 8]); context.beginPath(); context.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); context.fill(); context.stroke(); }
      context.setLineDash([]);
      for (const bumper of world.arena.bumpers || []) { context.fillStyle = "#142536"; context.strokeStyle = colors.ring; context.lineWidth = 3; context.beginPath(); context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2); context.fill(); context.stroke(); }
      for (const powerUp of world.arena.powerUps || []) if (powerUp.active) { const pulse=1+Math.sin(world.visualTime*5+powerUp.x)*.18;context.fillStyle = { heal: "#74e69a", haste: "#f2cf65", shield: "#69c9ff", damage:"#ff8a68",cooldown:"#78d8ff",ultimate: "#ba79ef",cleanse:"#e9ffff",clone:"#72d8d8",bounce:"#ffd66c",wallBoost:"#fff19b" }[powerUp.kind]||"#fff";context.shadowColor=context.fillStyle;context.shadowBlur=12; context.beginPath(); context.arc(powerUp.x, powerUp.y, powerUp.radius*pulse, 0, Math.PI * 2); context.fill();context.shadowBlur=0; }
      context.restore();
      context.save(); context.strokeStyle = world.suddenDeath ? "#ff627f" : this.hexToRgba(colors.ring, .82); context.lineWidth = world.suddenDeath ? 7 : 5; context.shadowColor = colors.ring; context.shadowBlur = this.performanceLevel >= 3 ? 0 : 12+world.arena.borderPulse*18; context.strokeRect(padding, padding, this.width - padding * 2, this.height - padding * 2);for(const mark of world.arena.impactMarks||[]){context.globalAlpha=mark.life/mark.maxLife;context.strokeStyle=mark.color;context.beginPath();context.moveTo(mark.x-mark.ny*18,mark.y+mark.nx*18);context.lineTo(mark.x+mark.ny*18,mark.y-mark.nx*18);context.stroke();}context.restore();
    }

    drawDecals(context,world){if(this.settings?.decals===false||this.performanceLevel>=3)return;context.save();for(const decal of this.particles.decals||[]){context.globalAlpha=OA.clamp(decal.life/decal.maxLife,0,.35);context.strokeStyle=decal.color;context.lineWidth=1.5;for(let i=0;i<6;i++){const a=i*Math.PI/3+decal.size*.01;context.beginPath();context.moveTo(decal.x+Math.cos(a)*6,decal.y+Math.sin(a)*6);context.lineTo(decal.x+Math.cos(a)*decal.size*(.5+(i%2)*.25),decal.y+Math.sin(a)*decal.size*(.5+(i%2)*.25));context.stroke();}}context.restore();}

    drawZones(context, world) {
      context.save();
      for (const zone of [...world.zones, ...(world.cinematicZones||[]), ...(world.characterZones || []), ...(world.poisonPools || [])]) {
        const opacity = OA.clamp(zone.life / zone.maxLife, 0, 1) * 0.28;
        const gradient = context.createRadialGradient(zone.x, zone.y, 3, zone.x, zone.y, zone.radius);
        gradient.addColorStop(0, this.hexToRgba(zone.color, opacity * 1.5));
        gradient.addColorStop(0.65, this.hexToRgba(zone.color, opacity * 0.5));
        gradient.addColorStop(1, this.hexToRgba(zone.color, 0));
        context.fillStyle = gradient;
        context.beginPath(); context.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); context.fill();
        context.strokeStyle = this.hexToRgba(zone.color, opacity + 0.15);
        context.setLineDash([7, 10]);
        context.beginPath(); context.arc(zone.x, zone.y, zone.radius * (0.82 + Math.sin(world.visualTime * 4) * 0.06), 0, Math.PI * 2); context.stroke();
      }
      context.setLineDash([]);
      context.restore();
    }

    drawSummons(context, world) {
      context.save();
      for (const summon of world.summons || []) {
        if (!summon.active) continue;
        const fade = OA.clamp(summon.life / Math.min(1, summon.maxLife), 0.15, 1);
        context.globalAlpha = fade;
        context.shadowColor = summon.color; context.shadowBlur = 12;
        context.fillStyle = summon.color; context.strokeStyle = summon.secondary || "#fff"; context.lineWidth = 2;
        context.beginPath(); context.arc(summon.x, summon.y, summon.radius, 0, Math.PI * 2); context.fill(); context.stroke();
        context.globalAlpha = 1; context.shadowBlur = 0;
      }
      context.restore();
    }

    drawTrail(context, fighter) {
      if (this.settings?.trails === false) return;
      if (fighter.trail.length < 2) return;
      context.save();
      context.lineCap = "round";
      context.globalCompositeOperation = "lighter";
      const stride = this.performanceLevel >= 2 ? 2 : 1;
      for (let index = stride; index < fighter.trail.length; index += stride) {
        const point = fighter.trail[index];
        const opacity = index / fighter.trail.length;
        context.strokeStyle = this.hexToRgba(point.boost ? "#fff39a" : fighter.trailColor, opacity * (point.boost ? 0.42 : 0.22) * (stride > 1 ? .55 : 1));
        context.lineWidth = fighter.radius * (point.boost ? 0.5 : 0.3) * opacity;
        context.beginPath();
        context.moveTo(fighter.trail[Math.max(0,index - stride)].x, fighter.trail[Math.max(0,index - stride)].y);
        context.lineTo(point.x, point.y);
        context.stroke();
      }
      context.restore();
    }

    drawFighter(context, fighter, alpha, time) {
      const x = fighter.previousX + (fighter.x - fighter.previousX) * alpha;
      const y = fighter.previousY + (fighter.y - fighter.previousY) * alpha;
      this.drawWeapon(context, fighter, x, y);
      context.save();
      context.translate(x, y);
      const moveAngle=Math.atan2(fighter.vy,fighter.vx),stretch=OA.clamp(fighter.currentSpeed()/Math.max(1,fighter.maxSpeed)-.55,0,.22);context.rotate(moveAngle);context.scale(1+stretch,1-stretch*.48);context.rotate(-moveAngle);
      const impactAngle = Math.atan2(fighter.deform.ny, fighter.deform.nx);
      context.rotate(impactAngle);
      context.scale(1 - fighter.deform.amount * 0.24, 1 + fighter.deform.amount * 0.17);
      context.rotate(-impactAngle);
      context.shadowBlur = this.settings?.glow === false || this.performanceLevel >= 3 ? 0 : 22 + (fighter.wallBoostTimer > 0 ? 18 : 0);
      context.shadowColor = fighter.wallBoostTimer > 0 ? "#fff39a" : fighter.color;
      const radius = fighter.radius;
      const sprite = this.fighterSprite(fighter, radius);
      context.drawImage(sprite.surface, -sprite.offset, -sprite.offset, sprite.logical, sprite.logical);
      context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2);
      context.lineWidth = 2.2;
      context.strokeStyle = fighter.invulnerability > 0 ? "#ffffff" : fighter.stroke;
      context.stroke();
      context.shadowBlur = 0;

      if (fighter.character) {
        this.drawCharacterPattern(context, fighter, radius, time);
        context.fillStyle = this.hexToRgba(fighter.glowColor || "#ffffff", .88);
        context.font = `700 ${Math.max(12, radius * .72)}px ${this.displayFont}`;
        context.textAlign = "center"; context.textBaseline = "middle";
        context.fillText(fighter.character.icon, 0, 1);
        if (fighter.spikes?.growth > .05) {
          context.save(); context.rotate(fighter.rotation); context.fillStyle = fighter.glowColor;
          for (let i=0;i<fighter.spikes.count;i+=1){const a=i*Math.PI*2/fighter.spikes.count;context.rotate(Math.PI*2/fighter.spikes.count);context.beginPath();context.moveTo(radius-2,-3);context.lineTo(radius+fighter.spikes.size*fighter.spikes.growth,0);context.lineTo(radius-2,3);context.fill();}
          context.restore();
        }
      }

      context.save();
      context.rotate(fighter.rotation);
      context.strokeStyle = this.hexToRgba(fighter.stroke, 0.56);
      context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, radius * 0.62, -0.8, 0.8); context.stroke();
      context.fillStyle = this.hexToRgba("#ffffff", 0.28);
      context.fillRect(radius * 0.22, -2, radius * 0.54, 4);
      context.restore();

      if (fighter.shield > 0) {
        context.strokeStyle = this.hexToRgba("#7deaff", 0.65);
        context.lineWidth = 3;
        context.beginPath(); context.arc(0, 0, radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fighter.shield / fighter.maxShield)); context.stroke();
      }
      if(fighter.burstProtection?.active>0){context.strokeStyle=this.hexToRgba("#d8f6ff",.55);context.lineWidth=2;context.setLineDash([2,5]);context.beginPath();context.arc(0,0,radius+13+Math.sin(time*9)*1.5,0,Math.PI*2);context.stroke();context.setLineDash([]);}
      if(this.settings?.statusEffects!==false){if(fighter.status.burning>0){context.fillStyle="#ff9b56";for(let i=0;i<3;i++){const a=time*2+i*2.1;context.beginPath();context.arc(Math.cos(a)*radius*.72,-radius+Math.sin(a)*5,2.2,0,Math.PI*2);context.fill();}}if(fighter.status.frozen>0){context.strokeStyle="#b9f3ff";context.beginPath();context.moveTo(-radius*.7,-radius*.2);context.lineTo(radius*.65,radius*.3);context.moveTo(-radius*.2,radius*.75);context.lineTo(radius*.25,-radius*.7);context.stroke();}if(fighter.status.slow>0){context.strokeStyle="#b898ff";context.globalAlpha=.5;context.beginPath();context.arc(0,0,radius+16,0,Math.PI*1.5);context.stroke();context.globalAlpha=1;}if(fighter.status.reflecting>0){context.strokeStyle="#9ff8ff";context.lineWidth=3;context.beginPath();context.arc(0,0,radius+11,0,Math.PI*2);context.stroke();}}
      context.strokeStyle = this.hexToRgba(fighter.wallBoostTimer > 0 ? "#fff39a" : fighter.color, fighter.wallBoostTimer > 0 ? 0.72 : 0.28);
      context.lineWidth = fighter.wallBoostTimer > 0 ? 2.5 : 1;
      context.setLineDash([4, 6]);
      context.beginPath(); context.arc(0, 0, radius + 7 + Math.sin(time * 6 + fighter.ai.phase) * 2, 0, Math.PI * 2); context.stroke();
      context.restore();

      if (this.hitboxes) {
        context.save();
        context.strokeStyle = "rgba(255,255,255,.7)";
        context.lineWidth = 1;
        context.beginPath(); context.arc(x, y, fighter.radius, 0, Math.PI * 2); context.stroke();
        context.restore();
      }
    }

    drawCharacterPattern(context, fighter, radius, time) {
      const texture=fighter.texture||"core",color=fighter.glowColor||fighter.stroke,pulse=.75+Math.sin(time*4+fighter.ai.phase)*.2;
      context.save();context.rotate(fighter.rotation*.35);context.strokeStyle=this.hexToRgba(color,.42);context.fillStyle=this.hexToRgba(fighter.secondaryColor||color,.18);context.lineWidth=1.4;
      if(["rune","ring","orbit","halo","time"].some(x=>texture.includes(x))){context.setLineDash([3,4]);for(const scale of [.42,.7]){context.beginPath();context.arc(0,0,radius*scale,0,Math.PI*2);context.stroke();}context.setLineDash([]);}
      else if(["ice","stone","crystal","decay"].some(x=>texture.includes(x))){for(let i=0;i<6;i++){const a=i*Math.PI/3;context.beginPath();context.moveTo(0,0);context.lineTo(Math.cos(a)*radius*.78,Math.sin(a)*radius*.78);context.stroke();}}
      else if(["electric","glitch","noise","wave"].some(x=>texture.includes(x))){context.beginPath();for(let i=0;i<9;i++){const a=i*Math.PI*2/8,r=radius*(i%2?.46:.78);const x=Math.cos(a)*r,y=Math.sin(a)*r;i?context.lineTo(x,y):context.moveTo(x,y);}context.stroke();}
      else if(["phase","mist","mirage","ink"].some(x=>texture.includes(x))){context.globalAlpha=.25;context.beginPath();context.arc(Math.sin(time*3)*5,Math.cos(time*2)*4,radius*.7,0,Math.PI*2);context.fill();}
      else{for(let i=0;i<4;i++){const a=i*Math.PI/2+time*.12;context.beginPath();context.arc(Math.cos(a)*radius*.34,Math.sin(a)*radius*.34,radius*.12,0,Math.PI*2);context.stroke();}}
      if((fighter.characterState?.ultimateCharge||0)>=100){context.strokeStyle=this.hexToRgba("#fff0a4",pulse);context.lineWidth=2.5;context.beginPath();context.arc(0,0,radius+5+pulse*2,0,Math.PI*2);context.stroke();}
      context.restore();
    }

    drawWeapon(context, fighter, x, y) {
      const weapon = fighter.weapon;
      if (!weapon) return;
      const state = fighter.weaponState;
      const direction = OA.Vector.fromAngle(state.angle);
      const active = state.active > 0;
      const length = weapon.kind === "melee" ? weapon.reach * (state.extension || 0.25) : fighter.radius + 13;
      context.save();
      context.translate(x, y);
      context.rotate(state.angle);
      context.shadowColor = weapon.color;
      context.shadowBlur = active ? 15 : 6;
      context.strokeStyle = weapon.color;
      context.fillStyle = weapon.color;
      context.lineCap = "round";
      if (weapon.kind === "melee") {
        context.lineWidth = Math.max(3, weapon.width);
        context.beginPath(); context.moveTo(fighter.radius * 0.45, 0); context.lineTo(length, 0); context.stroke();
        if (weapon.pattern === "twin") { context.beginPath(); context.moveTo(-fighter.radius * 0.45, 0); context.lineTo(-length * 0.86, 0); context.stroke(); }
        if (weapon.pattern === "smash") { context.beginPath(); context.arc(length, 0, weapon.width * 0.75, 0, Math.PI * 2); context.fill(); }
        if (weapon.pattern === "shield") { context.lineWidth = 5; context.beginPath(); context.arc(fighter.radius + 9, 0, 17, -1.1, 1.1); context.stroke(); }
        if (weapon.pattern === "chain") { context.setLineDash([5, 4]); context.lineWidth = 3; context.beginPath(); context.moveTo(fighter.radius, 0); context.lineTo(length, 0); context.stroke(); context.setLineDash([]); context.beginPath(); context.arc(length, 0, 7, 0, Math.PI * 2); context.fill(); }
      } else {
        context.fillRect(fighter.radius * 0.55, -4, 18, 8);
        context.beginPath(); context.moveTo(fighter.radius + 22, 0); context.lineTo(fighter.radius + 13, -5); context.lineTo(fighter.radius + 13, 5); context.closePath(); context.fill();
      }
      context.restore();
      void direction;
    }

    drawProjectiles(context) {
      context.save();
      context.globalCompositeOperation = "lighter";
      for (const projectile of this.projectiles.pool) {
        if (!projectile.active) continue;
        context.save();
        context.translate(projectile.x, projectile.y);
        context.rotate(projectile.rotation);
        context.shadowColor = projectile.color;
        context.shadowBlur = projectile.kind === "laser" ? 14 : 8;
        context.fillStyle = projectile.color;
        if (projectile.kind === "missile") context.fillRect(-8, -3, 16, 6);
        else if (projectile.kind === "laser") context.fillRect(-13, -projectile.radius, 26, projectile.radius * 2);
        else if (projectile.kind === "mine") { context.beginPath(); context.arc(0, 0, projectile.radius, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#fff"; context.beginPath(); context.moveTo(-projectile.radius - 3, 0); context.lineTo(projectile.radius + 3, 0); context.stroke(); }
        else { context.beginPath(); context.arc(0, 0, projectile.radius, 0, Math.PI * 2); context.fill(); }
        context.restore();
      }
      context.restore();
    }

    drawEffects(context, world) {
      for (const effect of world.effects) {
        context.save();
        if (effect.type === "clone") {
          context.globalAlpha = OA.clamp(effect.life / 2, 0.15, 0.46);
          context.fillStyle = effect.color;
          context.beginPath(); context.arc(effect.x, effect.y, effect.owner.radius * 0.92, 0, Math.PI * 2); context.fill();
        } else if (effect.type === "orbital") {
          context.translate(effect.x, effect.y); context.rotate(effect.angle * 1.7);
          context.fillStyle = effect.color; context.shadowColor = effect.color; context.shadowBlur = 10;
          context.beginPath(); context.moveTo(11, 0); context.lineTo(-6, -5); context.lineTo(-3, 6); context.closePath(); context.fill();
        } else if (effect.type === "drone") {
          for (let i = 0; i < effect.count; i += 1) {
            const angle = effect.angle + Math.PI * 2 * i / effect.count;
            const x = effect.owner.x + Math.cos(angle) * 48;
            const y = effect.owner.y + Math.sin(angle) * 48;
            context.fillStyle = effect.color; context.fillRect(x - 4, y - 4, 8, 8);
          }
        } else if (effect.type === "marker") {
          const ratio = effect.life / effect.maxLife;
          context.strokeStyle = effect.color; context.lineWidth = 2;
          context.beginPath(); context.arc(effect.x, effect.y, 16 + ratio * 55, 0, Math.PI * 2); context.stroke();
          context.beginPath(); context.moveTo(effect.x - 10, effect.y); context.lineTo(effect.x + 10, effect.y); context.moveTo(effect.x, effect.y - 10); context.lineTo(effect.x, effect.y + 10); context.stroke();
        } else if(effect.type==="telegraph"){
          const ratio=1-effect.life/effect.maxLife;context.strokeStyle=effect.color;context.fillStyle=this.hexToRgba(effect.color,.06+ratio*.1);context.lineWidth=2+ratio*2;context.setLineDash([7,8]);context.beginPath();context.arc(effect.x,effect.y,Math.max(18,effect.radius*(.35+ratio*.65)),0,Math.PI*2);context.fill();context.stroke();context.setLineDash([]);
        }
        context.restore();
      }
    }

    drawParticles(context) {
      context.save();
      context.globalCompositeOperation = "lighter";
      for (const particle of this.particles.particles) {
        if (!particle.active) continue;
        const opacity = OA.clamp(particle.life / particle.maxLife, 0, 1);
        context.strokeStyle = context.fillStyle = this.hexToRgba(particle.color, opacity);
        if (particle.type === "streak"||particle.type.includes("trail")||particle.type.includes("arc")) {
          context.lineWidth = particle.size * 0.7;
          context.beginPath(); context.moveTo(particle.x, particle.y); context.lineTo(particle.x - particle.vx * 0.045, particle.y - particle.vy * 0.045); context.stroke();
        } else if(particle.type.includes("smoke")||particle.type.includes("mist")||particle.type.includes("dust")||particle.type.includes("mote")){context.globalAlpha=opacity*.45;context.beginPath();context.arc(particle.x,particle.y,particle.size,0,Math.PI*2);context.fill();}else if(particle.type.includes("shard")||particle.type.includes("fragment")||particle.type.includes("debris")){context.beginPath();context.moveTo(particle.x+particle.size,particle.y);context.lineTo(particle.x-particle.size*.6,particle.y-particle.size*.5);context.lineTo(particle.x-particle.size*.4,particle.y+particle.size*.6);context.closePath();context.fill();}else context.fillRect(particle.x-particle.size/2,particle.y-particle.size/2,particle.size,particle.size);
      }
      context.restore();
    }

    drawWaves(context) {
      context.save();
      context.globalCompositeOperation = "lighter";
      for (const wave of this.particles.waves) {
        context.globalAlpha = wave.life / wave.maxLife;
        context.strokeStyle = wave.color;
        context.lineWidth = wave.width;
        context.beginPath(); context.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); context.stroke();
      }
      context.restore();
    }

    drawLightning(context) {
      context.save();
      context.globalCompositeOperation = "lighter";
      for (const bolt of this.particles.lightning) {
        context.globalAlpha = bolt.life / bolt.maxLife;
        context.strokeStyle = bolt.color;
        context.lineWidth = 2.5;
        context.shadowColor = bolt.color; context.shadowBlur = 10;
        context.beginPath(); bolt.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke();
      }
      context.restore();
    }

    drawDamageText(context) {
      context.save();
      context.textAlign = "center";
      for (const text of this.particles.texts) {
        const opacity = OA.clamp(text.life / text.maxLife, 0, 1);
        context.globalAlpha = opacity;
        context.fillStyle = text.critical ? "#fff38a" : text.color || "#e8fbff";
        context.font = `${text.critical ? 800 : 700} ${text.critical ? 20 : 13}px ${this.displayFont}`;
        context.fillText(text.label, text.x, text.y);
      }
      context.restore();
    }

    drawDebug(context, world) {
      for (const fighter of [world.player, world.enemy]) {
        context.lineWidth = 1.5;
        context.strokeStyle = "#ffcc58";
        context.beginPath(); context.moveTo(fighter.x, fighter.y); context.lineTo(fighter.x + fighter.vx * 0.18, fighter.y + fighter.vy * 0.18); context.stroke();
        context.strokeStyle = "#6bffb3";
        context.beginPath(); context.moveTo(fighter.x, fighter.y); context.lineTo(fighter.x + fighter.ax * 0.08, fighter.y + fighter.ay * 0.08); context.stroke();
        context.fillStyle = "rgba(4,10,17,.8)"; context.fillRect(fighter.x - 34, fighter.y + fighter.radius + 9, 68, 25);
        context.fillStyle = "#d9fbff"; context.font = "9px monospace"; context.textAlign = "center";
        context.fillText(`m ${fighter.mass.toFixed(2)} v ${Math.round(fighter.currentSpeed())}`, fighter.x, fighter.y + fighter.radius + 20);
        context.fillText(`F ${Math.round(Math.hypot(fighter.forceX, fighter.forceY))}`, fighter.x, fighter.y + fighter.radius + 30);
      }
      const normal = world.physicsStats.lastNormal;
      if (normal) {
        context.strokeStyle = "#ff66c9"; context.lineWidth = 2;
        context.beginPath(); context.moveTo(normal.atX, normal.atY); context.lineTo(normal.atX + normal.x * 55, normal.atY + normal.y * 55); context.stroke();
      }
    }

    drawSuddenDeath(context, time) {
      const alpha = 0.05 + Math.sin(time * 4) * 0.02;
      context.fillStyle = `rgba(255,35,88,${alpha})`;
      context.fillRect(0, 0, this.width, this.height);
      context.fillStyle = "rgba(255,150,165,.72)";
      context.font = "700 11px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText("MORTE SÚBITA // ARENA EM COLAPSO", this.width / 2, 39);
    }

    hexToRgba(hex, alpha) {
      const value = String(hex).replace("#", "");
      const full = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
      const number = Number.parseInt(full, 16);
      return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
    }
  }

  OA.Renderer = Renderer;
}());
