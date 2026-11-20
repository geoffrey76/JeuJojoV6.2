// Lancer avec : npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, step, difficulty, pickType, makeEnemy, getScore,
  WIDTH, HEIGHT, SHIP, START_LIVES, ENEMY_TYPES, LEVEL_SECONDS,
} from './shooterLogic.js';

// Générateur pseudo-aléatoire reproductible
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Partie sans apparition automatique, pour placer les objets à la main
const quiet = () => { const g = createGame(seeded(1)); g.spawnTimer = 1e9; return g; };

test('la difficulté augmente avec le temps', () => {
  const early = difficulty(0);
  const late = difficulty(90);
  assert.equal(early.level, 1);
  assert.ok(late.level > early.level);
  assert.ok(late.spawnEvery < early.spawnEvery);
  assert.ok(late.speedBase > early.speedBase);
});

test('la difficulté reste dans des limites jouables', () => {
  const extreme = difficulty(10_000);
  assert.ok(extreme.spawnEvery >= 0.3);
  assert.ok(extreme.speedBase <= 260);
});

test('seuls les petits astéroïdes au niveau 1, puis soucoupes et gros astéroïdes', () => {
  for (const roll of [0, 0.3, 0.6, 0.99]) assert.equal(pickType(1, roll), 'rock');
  const level2 = new Set([0, 0.5, 0.7, 0.99].map((r) => pickType(2, r)));
  assert.ok(level2.has('ufo') && !level2.has('big'));
  const level3 = new Set([0, 0.5, 0.7, 0.99].map((r) => pickType(3, r)));
  assert.ok(level3.has('big'));
});

test('le vaisseau reste dans l’écran', () => {
  const game = quiet();
  for (let i = 0; i < 200; i++) step(game, 0.016, { left: true });
  assert.equal(game.shipX, SHIP.width / 2);
  for (let i = 0; i < 400; i++) step(game, 0.016, { right: true });
  assert.equal(game.shipX, WIDTH - SHIP.width / 2);
});

test('le vaisseau suit la position visée (doigt ou souris)', () => {
  const game = quiet();
  for (let i = 0; i < 100; i++) step(game, 0.016, { targetX: 100 });
  assert.ok(Math.abs(game.shipX - 100) < 1);
});

test('la cadence de tir est limitée', () => {
  const game = quiet();
  for (let i = 0; i < 62; i++) step(game, 1 / 62, { fire: true }); // environ 1 seconde
  const shots = game.bullets.length;
  assert.ok(shots >= 4 && shots <= 5, `tirs : ${shots}`);
});

test('un tir détruit un petit astéroïde et rapporte des points', () => {
  const game = quiet();
  game.enemies.push(makeEnemy(game, 'rock', game.shipX, 300, 0));
  step(game, 0.016, { fire: true });
  for (let i = 0; i < 60 && game.enemies.length > 0; i++) step(game, 0.016, {});
  assert.equal(game.enemies.length, 0);
  assert.equal(game.kills, 1);
  assert.equal(game.killScore, ENEMY_TYPES.rock.points * game.level);
});

test('un gros astéroïde résiste à trois tirs', () => {
  const game = quiet();
  const big = makeEnemy(game, 'big', game.shipX, 250, 0);
  game.enemies.push(big);
  let shots = 0;
  for (let i = 0; i < 600 && !big.dead; i++) {
    step(game, 0.016, { fire: true });
    shots = i;
  }
  assert.ok(big.dead);
  assert.equal(game.kills, 1);
  assert.equal(big.hp, 0);
  assert.ok(shots > 0);
});

test('un tir très rapide ne traverse pas un objet (image lente)', () => {
  const game = quiet();
  game.enemies.push(makeEnemy(game, 'rock', game.shipX, 300, 0));
  game.bullets.push({ x: game.shipX, y: 340, prevY: 340 });
  step(game, 0.05, {});
  assert.equal(game.kills, 1);
});

test('un objet qui touche le vaisseau coûte une vie, puis protège 1,5 s', () => {
  const game = quiet();
  game.enemies.push(makeEnemy(game, 'rock', game.shipX, SHIP.y, 0));
  step(game, 0.016, {});
  assert.equal(game.lives, START_LIVES - 1);
  assert.ok(game.invulnerable > 0);
  // pendant l'invulnérabilité, un deuxième objet ne coûte rien
  game.enemies.push(makeEnemy(game, 'rock', game.shipX, SHIP.y, 0));
  step(game, 0.016, {});
  assert.equal(game.lives, START_LIVES - 1);
});

test('un objet qui arrive en bas coûte une vie', () => {
  const game = quiet();
  game.shipX = 40;
  game.enemies.push(makeEnemy(game, 'rock', 400, HEIGHT + 100, 0));
  step(game, 0.016, {});
  assert.equal(game.lives, START_LIVES - 1);
  assert.equal(game.enemies.length, 0);
});

test('la partie s’arrête à zéro vie et plus rien ne bouge', () => {
  const game = quiet();
  game.lives = 1;
  game.shipX = 40;
  game.enemies.push(makeEnemy(game, 'rock', 400, HEIGHT + 100, 0));
  step(game, 0.016, {});
  assert.equal(game.over, true);
  assert.equal(game.lives, 0);
  const time = game.time;
  step(game, 1, {});
  assert.equal(game.time, time);
});

test('le score compte le temps survécu et les objets détruits', () => {
  const game = quiet();
  for (let i = 0; i < 10; i++) step(game, 1, {}); // 10 secondes
  assert.equal(getScore(game), 20);
  game.killScore = 50;
  assert.equal(getScore(game), 70);
});

test('les points d’un objet sont multipliés par le niveau', () => {
  const game = quiet();
  game.time = LEVEL_SECONDS * 2; // niveau 3
  game.level = 3;
  const ufo = makeEnemy(game, 'ufo', game.shipX, 300, 0);
  ufo.phase = 0; // la soucoupe zigzague : on la place au centre de son mouvement
  game.enemies.push(ufo);
  game.bullets.push({ x: game.shipX, y: 320, prevY: 330 });
  step(game, 0.001, {});
  assert.equal(game.killScore, ENEMY_TYPES.ufo.points * 3);
});

test('sans rien faire, la partie finit par être perdue (le jeu est bien un défi)', () => {
  const game = createGame(seeded(7));
  const rng = seeded(8);
  for (let i = 0; i < 60 * 300 && !game.over; i++) step(game, 1 / 60, { targetX: 0 }, rng);
  assert.equal(game.over, true);
});

test('chaque tir est compté (pour le bruitage)', () => {
  const game = quiet();
  assert.equal(game.shots, 0);
  step(game, 0.016, { fire: true });
  assert.equal(game.shots, 1);
  step(game, 0.016, { fire: true }); // délai entre deux tirs : pas de nouveau tir
  assert.equal(game.shots, 1);
  step(game, 0.016, {}); // pas de tir sans commande
  assert.equal(game.shots, 1);
});
