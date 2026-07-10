/* Execute com: node tests/core-smoke.js */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;

const root = path.resolve(__dirname, "..");
[
  "js/config.js", "js/engine/vector.js", "js/engine/random.js",
  "js/data/physicsPresets.js", "js/data/arenaDefinitions.js", "js/data/weapons.js", "js/data/perks.js", "js/data/abilities.js",
  "js/entities/fighter.js", "js/entities/projectile.js", "js/engine/collision.js", "js/engine/particles.js",
  "js/systems/battleLogger.js", "js/systems/combatSystem.js", "js/systems/projectileSystem.js",
  "js/systems/weaponSystem.js", "js/systems/perkSystem.js", "js/systems/comboSystem.js",
  "js/systems/arenaSystem.js", "js/systems/abilitySystem.js", "js/engine/physics.js"
].forEach((file) => vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }));

const OA = global.OrbArena;
const silentAudio = { impact() {}, wall() {}, projectile() {}, weapon() {}, ability() {} };

function createFighter(team, x, vx, color, orbit) {
  return new OA.Fighter({
    id: team, team, name: team.toUpperCase(), color, stroke: "#ffffff", trailColor: color,
    x, y: 270, vx, vy: 0, ...OA.CONFIG.presets.balanced,
    style: "Agressivo", aggression: 1.08, orbit, phase: team === "player" ? 0.3 : 2.4, desiredDistance: 46
  });
}

function createRuntime(seed, presetId = "pinball") {
  const random = new OA.Random(seed);
  const physicsSettings = OA.getPhysicsPreset(presetId);
  const particles = new OA.ParticleSystem(random, 0.5);
  const logger = new OA.BattleLogger();
  const combat = new OA.CombatSystem(random, particles, silentAudio, logger);
  const projectiles = new OA.ProjectileSystem(random, combat, particles, silentAudio, 96);
  const arenaSystem = new OA.ArenaSystem(random, particles, silentAudio);
  const weaponSystem = new OA.WeaponSystem(random, projectiles, combat, particles, silentAudio);
  const perkSystem = new OA.PerkSystem(random, combat, projectiles, particles);
  const comboSystem = new OA.ComboSystem(particles);
  const abilitySystem = new OA.AbilitySystem(random, projectiles, combat, particles, silentAudio, logger);
  const physics = new OA.PhysicsSystem(random, combat, projectiles);
  const player = createFighter("player", 195, 255, "#39e7ff", 1);
  const enemy = createFighter("enemy", 765, -255, "#ff4f87", -1);
  const world = {
    seed, difficulty: "normal", physics: physicsSettings, phase: "active", time: 0, intensity: 1,
    suddenDeath: false, player, enemy, logger, events: [], zones: [], effects: [], scheduled: [],
    arena: arenaSystem.create(presetId), arenaSystem, camera: { trauma: 0, zoom: 1 },
    timeDilation: { scale: 1, timer: 0 }, physicsStats: { substeps: 1, collisions: 0, lastImpact: 0, lastNormal: null }, finished: false
  };
  weaponSystem.equip(player, "spin-blade");
  weaponSystem.equip(enemy, "arc-cannon");
  perkSystem.assign(player, player.weapon);
  perkSystem.assign(enemy, enemy.weapon);
  abilitySystem.assign(player, player.weapon);
  abilitySystem.assign(enemy, enemy.weapon);
  comboSystem.initialize(player);
  comboSystem.initialize(enemy);
  return { random, particles, logger, combat, projectiles, arenaSystem, weaponSystem, perkSystem, comboSystem, abilitySystem, physics, world };
}

function simulate(seed, presetId = "pinball") {
  const runtime = createRuntime(seed, presetId);
  const { world, arenaSystem, abilitySystem, perkSystem, weaponSystem, physics, projectiles, comboSystem, particles, logger } = runtime;
  const step = OA.CONFIG.loop.fixedStep;
  while (world.time < OA.CONFIG.battle.timeLimit && world.player.alive && world.enemy.alive) {
    world.time += step;
    world.intensity = world.time < 20 ? 1 : world.time < 40 ? 1.1 : world.time < 60 ? 1.25 : 1.45;
    world.suddenDeath = world.time >= OA.CONFIG.battle.suddenDeathAt;
    arenaSystem.update(world, step);
    abilitySystem.update(world, step);
    perkSystem.update(world, step);
    weaponSystem.update(world, step);
    physics.update(world, step);
    projectiles.update(world, step);
    comboSystem.update(world, step);
    particles.update(step);
    const events = world.events.splice(0);
    perkSystem.process(world, events);
    comboSystem.process(world, events);
    abilitySystem.processEvents(world, events);
  }
  const winner = world.player.alive === world.enemy.alive
    ? (world.player.healthRatio() >= world.enemy.healthRatio() ? "player" : "enemy")
    : (world.player.alive ? "player" : "enemy");
  return {
    winner, time: Number(world.time.toFixed(4)),
    playerHealth: Number(world.player.health.toFixed(4)), enemyHealth: Number(world.enemy.health.toFixed(4)),
    playerDamage: Number(logger.stats.player.damageDealt.toFixed(4)), enemyDamage: Number(logger.stats.enemy.damageDealt.toFixed(4)),
    collisions: world.physicsStats.collisions, playerMaxSpeed: Number(world.player.telemetry.maxSpeed.toFixed(3)),
    wallBoosts: world.player.telemetry.wallBoosts, abilityUses: world.player.telemetry.abilitiesUsed,
    entries: logger.entries.length
  };
}

const rngA = new OA.Random("TEST-SEED");
const rngB = new OA.Random("TEST-SEED");
assert.deepEqual(Array.from({ length: 16 }, () => rngA.next()), Array.from({ length: 16 }, () => rngB.next()), "RNG deve ser reproduzível");
assert.equal(OA.ABILITIES.length, 70, "O catálogo deve possuir 70 habilidades funcionais");
assert.equal(OA.WEAPONS.length, 12, "O arsenal deve possuir 12 armas físicas");
assert.equal(Object.keys(OA.PHYSICS_PRESETS).length, 8, "Devem existir oito presets de física");

const circleA = { x: 0, y: 0, radius: 10 };
const circleB = { x: 15, y: 0, radius: 10 };
assert.equal(Math.round(OA.Collision.circles(circleA, circleB).overlap), 5, "Colisão circular deve medir sobreposição");
assert.ok(OA.Collision.segmentCircle(0, 0, 100, 0, 50, 3, 5), "CCD de segmento deve detectar alvo atravessado");

const abilityRuntime = createRuntime("ABILITY-COVERAGE", "arcade");
for (const ability of OA.ABILITIES) {
  const { world, abilitySystem } = abilityRuntime;
  world.player.health = world.player.maxHealth;
  world.player.alive = true;
  world.enemy.health = world.enemy.maxHealth;
  world.enemy.alive = true;
  world.player.abilityCooldowns[ability.id] = 0;
  assert.doesNotThrow(() => abilitySystem.execute(world, world.player, world.enemy, ability), `Habilidade ${ability.id} deve possuir comportamento executável`);
}

const first = simulate("CP-SMOKE-V2");
const replay = simulate("CP-SMOKE-V2");
assert.deepEqual(first, replay, "Mesma seed, preset e configuração devem repetir o resultado");
assert.ok(first.entries > 0 && first.playerDamage + first.enemyDamage > 0, "A simulação deve produzir combate e dano");
assert.ok(first.collisions > 0, "A física deve resolver colisões reais");
assert.ok(first.playerMaxSpeed >= OA.PHYSICS_PRESETS.pinball.minSpeed, "O controlador deve manter velocidade de combate");

const batch = Array.from({ length: 12 }, (_, index) => simulate(`CP-V2-BATCH-${index}`, index % 2 ? "arcade" : "pinball"));
assert.ok(batch.every((battle) => battle.entries > 0), "Todas as seeds devem produzir eventos");
assert.ok(batch.every((battle) => battle.time <= OA.CONFIG.battle.timeLimit + OA.CONFIG.loop.fixedStep), "Nenhum duelo pode ultrapassar o limite");
assert.ok(batch.every((battle) => Number.isFinite(battle.playerHealth + battle.enemyHealth + battle.playerMaxSpeed)), "O lote não pode produzir estados inválidos");

console.log("Physics/combat V2 smoke test OK", {
  catalog: { abilities: OA.ABILITIES.length, weapons: OA.WEAPONS.length, perks: OA.PERKS.length, physicsPresets: Object.keys(OA.PHYSICS_PRESETS).length },
  replay: first,
  batch: { battles: batch.length, playerWins: batch.filter((battle) => battle.winner === "player").length, averageDuration: Number((batch.reduce((sum, battle) => sum + battle.time, 0) / batch.length).toFixed(2)), maxObservedSpeed: Math.round(Math.max(...batch.map((battle) => battle.playerMaxSpeed))) }
});
