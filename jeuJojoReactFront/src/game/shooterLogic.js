// Règles du jeu de tir, sans React ni dessin : on peut les tester avec `npm test`.
// Le jeu travaille dans un repère fixe de 480 x 640 ; l'affichage s'adapte ensuite à l'écran.

export const WIDTH = 480;
export const HEIGHT = 640;
export const START_LIVES = 5;
export const TIME_POINTS_PER_SECOND = 2; // points gagnés pour chaque seconde survécue
export const LEVEL_SECONDS = 20; // un niveau de plus toutes les 20 secondes

export const SHIP = { width: 44, height: 36, y: HEIGHT - 56, speed: 380, followSpeed: 800, hitRadius: 15 };
const FIRE_INTERVAL = 0.22; // secondes entre deux tirs
const BULLET_SPEED = 640;
const BULLET_RADIUS = 4;
const INVULNERABLE_TIME = 1.5; // après une collision avec le vaisseau

// Les objets qui descendent. `points` est multiplié par le niveau en cours quand on les détruit.
export const ENEMY_TYPES = {
  rock: { radius: 18, hp: 1, points: 10, speed: 1 }, // petit astéroïde
  ufo: { radius: 20, hp: 1, points: 25, speed: 1.3 }, // soucoupe rapide, qui zigzague (dès le niveau 2)
  big: { radius: 32, hp: 3, points: 40, speed: 0.6 }, // gros astéroïde, 3 tirs (dès le niveau 3)
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// La difficulté dépend du temps écoulé : plus on joue longtemps, plus ça descend vite et souvent.
export function difficulty(elapsed) {
  return {
    level: 1 + Math.floor(elapsed / LEVEL_SECONDS),
    spawnEvery: Math.max(0.3, 1.1 - elapsed * 0.012), // secondes entre deux objets
    speedBase: Math.min(260, 70 + elapsed * 1.6), // pixels par seconde
  };
}

export function createGame(rng = Math.random) {
  return {
    time: 0,
    level: 1,
    lives: START_LIVES,
    killScore: 0,
    kills: 0,
    shots: 0, // nombre de tirs effectués (sert à déclencher le bruitage)
    over: false,
    shipX: WIDTH / 2,
    cooldown: 0,
    invulnerable: 0,
    banner: 0, // durée restante de l'annonce « Niveau n »
    spawnTimer: 0.8,
    nextId: 1,
    bullets: [],
    enemies: [],
    particles: [],
    stars: Array.from({ length: 50 }, () => ({
      x: rng() * WIDTH,
      y: rng() * HEIGHT,
      size: 0.5 + rng() * 1.5,
      speed: 20 + rng() * 60,
    })),
  };
}

// Score = points du temps + objets détruits (chacun multiplié par le niveau du moment)
export const getScore = (game) => game.killScore + Math.floor(game.time * TIME_POINTS_PER_SECOND);

// Choix du type d'objet : les soucoupes arrivent au niveau 2 et les gros astéroïdes au niveau 3
export function pickType(level, roll) {
  const weights = [
    ['rock', 1],
    ['ufo', level >= 2 ? 0.5 : 0],
    ['big', level >= 3 ? 0.35 : 0],
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let remaining = roll * total;
  for (const [type, weight] of weights) {
    if (remaining < weight) return type;
    remaining -= weight;
  }
  return 'rock';
}

export function makeEnemy(game, type, x, y, speed, rng = Math.random) {
  const def = ENEMY_TYPES[type];
  return {
    id: game.nextId++,
    type,
    x,
    baseX: x,
    y,
    vy: speed,
    r: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    age: 0,
    phase: rng() * Math.PI * 2,
    rot: 0,
    spin: (rng() - 0.5) * 2,
    flash: 0,
    dead: false,
    shape: Array.from({ length: 9 }, () => 0.8 + rng() * 0.3),
  };
}

function spawnEnemy(game, rng) {
  const diff = difficulty(game.time);
  const type = pickType(diff.level, rng());
  const def = ENEMY_TYPES[type];
  const x = def.radius + rng() * (WIDTH - 2 * def.radius);
  const speed = diff.speedBase * def.speed * (0.85 + rng() * 0.3);
  game.enemies.push(makeEnemy(game, type, x, -def.radius, speed, rng));
}

function explode(game, x, y, count, rng) {
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = 40 + rng() * 160;
    game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.4 + rng() * 0.4, maxLife: 0.8 });
  }
}

function loseLife(game, withInvulnerability) {
  game.lives -= 1;
  if (withInvulnerability) game.invulnerable = INVULNERABLE_TIME;
  if (game.lives <= 0) {
    game.lives = 0;
    game.over = true;
  }
}

// Fait défiler les étoiles du fond (aussi quand le jeu n'est pas en cours)
export function scrollStars(game, dt) {
  for (const star of game.stars) {
    star.y += star.speed * (1 + game.level * 0.15) * dt;
    if (star.y > HEIGHT) star.y -= HEIGHT;
  }
}

// Avance le jeu de `dt` secondes. input = { left, right, fire, targetX }
export function step(game, dt, input = {}, rng = Math.random) {
  if (game.over) return game;
  game.time += dt;
  const diff = difficulty(game.time);
  if (diff.level > game.level) {
    game.level = diff.level;
    game.banner = 1.5;
  }
  game.banner = Math.max(0, game.banner - dt);

  // --- Vaisseau : clavier, ou suit le doigt / la souris (targetX)
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction !== 0) {
    game.shipX += direction * SHIP.speed * dt;
  } else if (typeof input.targetX === 'number') {
    const maxMove = SHIP.followSpeed * dt;
    game.shipX += clamp(input.targetX - game.shipX, -maxMove, maxMove);
  }
  game.shipX = clamp(game.shipX, SHIP.width / 2, WIDTH - SHIP.width / 2);
  game.invulnerable = Math.max(0, game.invulnerable - dt);

  // --- Tir
  game.cooldown = Math.max(0, game.cooldown - dt);
  if (input.fire && game.cooldown === 0) {
    const y = SHIP.y - SHIP.height / 2;
    game.bullets.push({ x: game.shipX, y, prevY: y });
    game.shots += 1;
    game.cooldown = FIRE_INTERVAL;
  }

  // --- Nouveaux objets
  game.spawnTimer -= dt;
  while (game.spawnTimer <= 0) {
    spawnEnemy(game, rng);
    game.spawnTimer += diff.spawnEvery * (0.75 + rng() * 0.5);
  }

  // --- Déplacements
  for (const bullet of game.bullets) {
    bullet.prevY = bullet.y;
    bullet.y -= BULLET_SPEED * dt;
  }
  for (const enemy of game.enemies) {
    enemy.age += dt;
    enemy.y += enemy.vy * dt;
    enemy.rot += enemy.spin * dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    if (enemy.type === 'ufo') {
      enemy.x = clamp(enemy.baseX + Math.sin(enemy.age * 2.2 + enemy.phase) * 60, enemy.r, WIDTH - enemy.r);
    }
  }

  // --- Tirs contre objets (le tir est un petit segment vertical, pour ne rien traverser)
  for (const bullet of game.bullets) {
    const top = Math.min(bullet.prevY, bullet.y);
    const bottom = Math.max(bullet.prevY, bullet.y);
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = bullet.x - enemy.x;
      const dy = clamp(enemy.y, top, bottom) - enemy.y;
      const reach = enemy.r + BULLET_RADIUS;
      if (dx * dx + dy * dy > reach * reach) continue;
      bullet.used = true;
      enemy.hp -= 1;
      enemy.flash = 0.1;
      if (enemy.hp <= 0) {
        enemy.dead = true;
        game.killScore += ENEMY_TYPES[enemy.type].points * game.level;
        game.kills += 1;
        explode(game, enemy.x, enemy.y, 14, rng);
      } else {
        explode(game, bullet.x, bullet.y, 3, rng);
      }
      break;
    }
  }

  // --- Objets contre vaisseau (sans effet pendant l'invulnérabilité)
  if (game.invulnerable === 0) {
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = game.shipX - enemy.x;
      const dy = SHIP.y - enemy.y;
      const reach = enemy.r + SHIP.hitRadius;
      if (dx * dx + dy * dy <= reach * reach) {
        enemy.dead = true;
        explode(game, enemy.x, enemy.y, 14, rng);
        loseLife(game, true);
        break;
      }
    }
  }

  // --- Objets arrivés en bas : une vie perdue
  for (const enemy of game.enemies) {
    if (!enemy.dead && enemy.y - enemy.r > HEIGHT) {
      enemy.dead = true;
      loseLife(game, false);
    }
  }

  game.bullets = game.bullets.filter((b) => !b.used && b.y > -10);
  game.enemies = game.enemies.filter((e) => !e.dead);

  // --- Décor
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
  scrollStars(game, dt);
  return game;
}
