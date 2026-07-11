(function () {
  "use strict";
  const OA = window.OrbArena;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const point = (origin, length, angle) => ({ x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length });
  const STATES = Object.freeze(["idle", "idle-tired", "walk", "run", "sprint", "start-run", "stop-run", "turn", "crouch", "jump-anticipation", "jump", "double-jump", "airborne", "fall", "fast-fall", "land-light", "land-heavy", "roll", "forward-roll", "back-roll", "dash", "back-dash", "air-dash", "wall-jump", "wall-slide", "light-punch", "heavy-punch", "jab", "hook", "uppercut", "light-kick", "heavy-kick", "low-kick", "air-kick", "spin-kick", "sweep", "block", "high-block", "low-block", "perfect-block", "parry", "counter", "grab", "throw", "air-throw", "knockback", "wall-hit", "ground-bounce", "knockdown", "grounded", "getting-up", "recovery-roll", "stun", "hit-light", "hit-medium", "hit-heavy", "ultimate", "death", "victory", "defeat", "taunt"]);
  const VALID_TRANSITIONS = Object.freeze({ death: ["death"], grounded: ["getting-up", "recovery-roll", "death"], knockdown: ["grounded", "getting-up", "death"], ultimate: ["idle", "fall", "death"], parry: ["counter", "idle", "hit-heavy", "death"] });

  class StickAnimationSystem {
    initialize(fighter) {
      fighter.stick.animation ||= { state: "idle", previous: "idle", blend: 1, reaction: 0, ragdoll: 0, roll: 0, impactX: 0, impactY: 0, hitLatch: 0, pose: null, previousPose: null };
      return fighter.stick.animation;
    }
    normalizeState(fighter) {
      const s = fighter.stick, raw = String(s.state || "idle");
      if (!fighter.alive) return "death"; if (s.animation?.reaction > 0) return s.animation.state;
      if (raw === "hit-medium") return "hit-medium"; if (raw === "hit-heavy") return "hit-heavy"; if (raw === "hit-light") return "hit-light";
      if (raw.startsWith("hit-")) return raw === "hit-heavy" ? "heavy-punch" : raw === "hit-medium" ? "hook" : "jab";
      if (!s.onGround) return fighter.vy < -80 ? "jump" : fighter.vy > 230 ? "fast-fall" : "fall";
      if (s.block > .2) return "block"; if (Math.abs(fighter.vx) > 310) return "sprint"; if (Math.abs(fighter.vx) > 170) return "run"; if (Math.abs(fighter.vx) > 28) return "walk";
      return fighter.healthRatio?.() < .24 ? "idle-tired" : "idle";
    }
    canTransition(from, to) { const restricted = VALID_TRANSITIONS[from]; return !restricted || restricted.includes(to); }
    transition(fighter, next, duration = .12) {
      const animation = this.initialize(fighter); if (animation.state === next || !this.canTransition(animation.state, next)) return;
      animation.previous = animation.state; animation.state = next; animation.blend = 0; animation.blendDuration = duration; animation.previousPose = animation.pose;
    }
    impact(fighter, force, direction, kind = "light") {
      const animation = this.initialize(fighter), heavy = force > 190 || kind === "heavy";
      animation.impactX = direction?.x || Math.sign(fighter.vx) || 1; animation.impactY = direction?.y || 0; animation.reaction = heavy ? .62 : .22; animation.ragdoll = heavy ? clamp(force / 420, .35, .9) : 0;
      this.transition(fighter, heavy ? "hit-heavy" : kind === "medium" ? "hit-medium" : "hit-light", .04);
    }
    update(fighter, dt) {
      const animation = this.initialize(fighter); animation.hitLatch = Math.max(0, animation.hitLatch - dt); if (fighter.deform.flash > .3 && animation.hitLatch <= 0) { this.impact(fighter, fighter.deform.flash * 360, { x: fighter.deform.nx || Math.sign(fighter.vx) || 1, y: fighter.deform.ny || 0 }, fighter.deform.flash > .72 ? "heavy" : fighter.deform.flash > .48 ? "medium" : "light"); animation.hitLatch = .18; } animation.reaction = Math.max(0, animation.reaction - dt); animation.ragdoll = Math.max(0, animation.ragdoll - dt * .55); animation.roll += Math.abs(fighter.vx) * dt / Math.max(1, fighter.radius * 2.4);
      const requested = this.normalizeState(fighter); this.transition(fighter, requested, ["hit-heavy", "knockback", "death"].includes(requested) ? .06 : .14);
      animation.blend = Math.min(1, animation.blend + dt / Math.max(.04, animation.blendDuration || .12));
      animation.pose = this.pose(fighter, animation.state, fighter.stick.animationTime || 0);
      if (animation.previousPose && animation.blend < 1) animation.pose = this.blendPose(animation.previousPose, animation.pose, animation.blend * animation.blend * (3 - 2 * animation.blend));
    }
    blendPose(a, b, t) { const output = {}; for (const key of Object.keys(b)) output[key] = typeof b[key] === "number" ? lerp(a?.[key] ?? b[key], b[key], t) : b[key]; return output; }
    pose(fighter, state, time) {
      const r = fighter.radius, speed = clamp(Math.abs(fighter.vx) / 320, 0, 1), cycle = time * (state === "sprint" ? 15 : state === "run" ? 11 : 7) + fighter.ai.phase, wave = Math.sin(cycle), breathe = Math.sin(time * 2.4 + fighter.ai.phase), p = { rootX: 0, rootY: 0, lean: 0, crouch: 0, headX: 0, headY: 0, armL: -.25, foreL: .35, armR: .15, foreR: -.25, legL: .18, kneeL: -.28, legR: -.18, kneeR: .28, twist: 0 };
      if (state === "idle") { p.rootY = breathe * r * .035; p.armL += breathe * .06; p.armR -= breathe * .06; p.headY = breathe * r * .03; }
      if (state === "idle-tired") { p.lean = .18; p.crouch = .14; p.armL = .65; p.armR = .45; p.headY = r * .12 + Math.abs(breathe) * r * .08; }
      if (["walk", "run", "sprint"].includes(state)) { const amp = state === "walk" ? .42 : state === "run" ? .76 : 1.05; p.lean = .05 + speed * .18; p.rootY = Math.abs(wave) * -r * .1; p.legL = wave * amp; p.legR = -wave * amp; p.kneeL = Math.max(0, -wave) * .85; p.kneeR = Math.max(0, wave) * .85; p.armL = -wave * amp * .72; p.armR = wave * amp * .72; p.foreL = -.25 - Math.max(0, wave) * .5; p.foreR = .25 + Math.max(0, -wave) * .5; }
      if (["jump-anticipation", "crouch"].includes(state)) { p.crouch = .55; p.lean = -.12; p.legL = -.35; p.legR = .35; p.kneeL = p.kneeR = .85; p.armL = -.8; p.armR = .8; }
      if (["jump", "double-jump", "wall-jump"].includes(state)) { p.rootY = -r * .1; p.legL = -.55; p.legR = .45; p.kneeL = .9; p.kneeR = -.7; p.armL = -1.55; p.armR = -1.2; p.foreL = -.4; p.foreR = .4; }
      if (["fall", "airborne", "fast-fall", "air-dash"].includes(state)) { p.lean = .08; p.legL = .35; p.legR = -.35; p.kneeL = .4; p.kneeR = -.4; p.armL = -1.05; p.armR = 1.05; }
      if (["dash", "back-dash"].includes(state)) { p.lean = state === "back-dash" ? -.46 : .46; p.armL = 1.25; p.armR = 1.45; p.legL = -.65; p.legR = .65; p.rootY = r * .12; }
      if (["jab", "light-punch", "hit-light"].includes(state)) { p.lean = .16; p.armR = -1.12; p.foreR = 0; p.armL = .65; p.foreL = -.8; p.twist = -.15; }
      if (["hook", "heavy-punch", "hit-medium"].includes(state)) { const strike = Math.sin(Math.min(1, (time * 5) % 1) * Math.PI); p.lean = .25; p.twist = -.5 * strike; p.armR = -.25; p.foreR = -1.3; p.armL = .75; }
      if (state === "uppercut") { p.crouch = .18; p.lean = -.25; p.armR = -1.5; p.foreR = -.12; p.armL = .8; }
      if (["light-kick", "heavy-kick", "air-kick", "spin-kick", "sweep"].includes(state)) { p.lean = -.35; p.legR = -1.12; p.kneeR = state === "heavy-kick" ? 0 : .25; p.legL = .22; p.kneeL = .4; p.armL = -.8; p.armR = .8; p.twist = .3; }
      if (["block", "high-block", "low-block", "perfect-block", "parry"].includes(state)) { p.crouch = state === "low-block" ? .35 : .08; p.lean = -.08; p.armL = -1.05; p.foreL = -1.15; p.armR = -.55; p.foreR = -1.3; }
      if (["hit-heavy", "knockback", "wall-hit"].includes(state)) { const a = fighter.stick.animation; p.lean = -.72 * (a.impactX || 1); p.twist = .45 * (a.impactX || 1); p.headX = -r * .3 * (a.impactX || 1); p.armL = -1.3; p.armR = 1.15; p.legL = -.5; p.legR = .55; }
      if (["knockdown", "grounded", "death", "defeat"].includes(state)) { p.rootY = r * 1.1; p.lean = -Math.PI / 2; p.headY = r * .18; p.armL = -1; p.armR = .8; p.legL = -.55; p.legR = .62; }
      if (["roll", "forward-roll", "back-roll", "recovery-roll"].includes(state)) { p.lean = fighter.stick.animation.roll; p.crouch = .8; p.armL = p.armR = -.8; p.legL = p.legR = .8; }
      if (state === "getting-up") { const rise = clamp((time * 1.8) % 1, 0, 1); p.rootY = r * (1 - rise); p.lean = lerp(-1.4, .08, rise); p.crouch = 1 - rise; }
      if (state === "ultimate") { p.rootY = -r * .1; p.armL = -1.8; p.armR = -1.34; p.legL = -.3; p.legR = .3; p.twist = Math.sin(time * 9) * .12; }
      if (state === "victory") { p.armL = p.armR = -1.6; p.foreL = -.3; p.foreR = .3; p.rootY = Math.abs(Math.sin(time * 4)) * -r * .08; }
      const ragdoll = fighter.stick.animation.ragdoll; if (ragdoll > 0) { const noise = Math.sin(time * 17 + fighter.ai.phase); p.lean += clamp(fighter.vx / 500, -1, 1) * ragdoll; p.armL += noise * ragdoll; p.armR -= noise * ragdoll; p.legL -= noise * ragdoll * .7; p.legR += noise * ragdoll * .7; p.headX += noise * r * .12 * ragdoll; }
      return p;
    }
    solveTwoBone(root, target, upper, lower, bend) {
      const dx = target.x - root.x, dy = target.y - root.y, distance = clamp(Math.hypot(dx, dy), Math.abs(upper - lower) + .01, upper + lower - .01), base = Math.atan2(dy, dx), offset = Math.acos(clamp((upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1)) * bend, elbow = point(root, upper, base + offset); return { mid: elbow, end: point(elbow, lower, Math.atan2(target.y - elbow.y, target.x - elbow.x)) };
    }
    skeleton(fighter, p) {
      const r = fighter.radius, pelvis = { x: p.rootX, y: p.rootY - r * .12 + p.crouch * r * .65 }, trunkAngle = -Math.PI / 2 + p.lean, chest = point(pelvis, r * .88, trunkAngle), neck = point(chest, r * .22, trunkAngle), head = point(neck, r * .5, trunkAngle); head.x += p.headX; head.y += p.headY;
      const shoulderL = point(chest, r * .2, trunkAngle - Math.PI / 2), shoulderR = point(chest, r * .2, trunkAngle + Math.PI / 2), hipL = point(pelvis, r * .13, trunkAngle - Math.PI / 2), hipR = point(pelvis, r * .13, trunkAngle + Math.PI / 2);
      const armAngleL = trunkAngle + p.armL, armAngleR = trunkAngle + p.armR, elbowL = point(shoulderL, r * .7, armAngleL), elbowR = point(shoulderR, r * .7, armAngleR), handL = point(elbowL, r * .62, armAngleL + p.foreL), handR = point(elbowR, r * .62, armAngleR + p.foreR);
      const ground = r * 1.55 - p.rootY, strideL = Math.sin(p.legL) * r * .75, strideR = Math.sin(p.legR) * r * .75, legL = this.solveTwoBone(hipL, { x: pelvis.x + strideL, y: ground - Math.max(0, Math.cos(p.legL)) * r * .04 }, r * .82, r * .78, p.kneeL >= 0 ? 1 : -1), legR = this.solveTwoBone(hipR, { x: pelvis.x + strideR, y: ground - Math.max(0, Math.cos(p.legR)) * r * .04 }, r * .82, r * .78, p.kneeR >= 0 ? 1 : -1);
      const footL = point(legL.end, r * .35, -.08), footR = point(legR.end, r * .35, -.08);
      return { pelvis, chest, neck, head, shoulderL, elbowL, handL, shoulderR, elbowR, handR, hipL, kneeL: legL.mid, ankleL: legL.end, footL, hipR, kneeR: legR.mid, ankleR: legR.end, footR };
    }
    render(context, fighter, alpha, time, renderer) {
      const x = OA.lerp(fighter.previousX, fighter.x, alpha), y = OA.lerp(fighter.previousY, fighter.y, alpha), s = fighter.stick, p = s.animation?.pose || this.pose(fighter, "idle", time), joints = this.skeleton(fighter, p), facing = s.facing || 1, r = fighter.radius;
      context.save(); context.translate(x, y); context.scale(facing, 1); context.rotate(p.twist || 0); context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = fighter.deform.flash > .25 ? "#fff" : fighter.color; context.fillStyle = fighter.stroke; context.shadowColor = fighter.glowColor || fighter.color; context.shadowBlur = 9; context.lineWidth = Math.max(3, r * .2);
      const limb = (a, b) => { context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke(); };
      limb(joints.neck, joints.chest); limb(joints.chest, joints.pelvis); limb(joints.shoulderL, joints.elbowL); limb(joints.elbowL, joints.handL); limb(joints.shoulderR, joints.elbowR); limb(joints.elbowR, joints.handR); limb(joints.hipL, joints.kneeL); limb(joints.kneeL, joints.ankleL); limb(joints.ankleL, joints.footL); limb(joints.hipR, joints.kneeR); limb(joints.kneeR, joints.ankleR); limb(joints.ankleR, joints.footR);
      context.beginPath(); context.arc(joints.head.x, joints.head.y, r * .43, 0, Math.PI * 2); context.fill(); context.stroke();
      for (const joint of [joints.neck, joints.pelvis, joints.elbowL, joints.elbowR, joints.handL, joints.handR, joints.kneeL, joints.kneeR]) { context.beginPath(); context.arc(joint.x, joint.y, Math.max(1.8, r * .085), 0, Math.PI * 2); context.fill(); }
      if (s.block > 0) { context.strokeStyle = "#7deaff"; context.lineWidth = 3; context.beginPath(); context.arc(r * .45, -r * .85, r * 1.1, -1.15, 1.15); context.stroke(); }
      if (s.animation?.ragdoll > .15) { context.globalAlpha = s.animation.ragdoll * .35; context.strokeStyle = "#fff"; context.setLineDash([3, 5]); context.beginPath(); context.arc(joints.pelvis.x, joints.pelvis.y, r * 1.8, 0, Math.PI * 2); context.stroke(); context.setLineDash([]); }
      context.restore(); renderer.drawWeapon(context, fighter, x, y - r * .8);
    }
  }
  OA.STICK_ANIMATION_STATES = STATES; OA.STICK_VALID_TRANSITIONS = VALID_TRANSITIONS; OA.StickAnimationSystem = StickAnimationSystem;
}());
