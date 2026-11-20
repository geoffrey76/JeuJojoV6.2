// Dessin du jeu de tir sur le canvas (aucune règle ici, voir shooterLogic.js)
import { WIDTH, HEIGHT, SHIP, START_LIVES, getScore } from './shooterLogic';

const formatTime = (seconds) => {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function drawShipShape(ctx, x, y, scale = 1, flame = 0) {
  const w = (SHIP.width / 2) * scale;
  const h = (SHIP.height / 2) * scale;
  if (flame > 0) {
    ctx.fillStyle = '#ffb74d';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y + h * 0.7);
    ctx.lineTo(x, y + h * (0.9 + flame));
    ctx.lineTo(x + w * 0.35, y + h * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#e8eaf6';
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h * 0.45);
  ctx.lineTo(x - w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(x, y + h * 0.05, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.rot);
  ctx.beginPath();
  enemy.shape.forEach((factor, i) => {
    const angle = (i / enemy.shape.length) * Math.PI * 2;
    const px = Math.cos(angle) * enemy.r * factor;
    const py = Math.sin(angle) * enemy.r * factor;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  const damaged = enemy.type === 'big' && enemy.hp < enemy.maxHp;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.type === 'big' ? (damaged ? '#a1665a' : '#795548') : '#8d6e63';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d7ccc8';
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(-enemy.r * 0.3, -enemy.r * 0.2, enemy.r * 0.2, 0, Math.PI * 2);
  ctx.arc(enemy.r * 0.25, enemy.r * 0.3, enemy.r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUfo(ctx, enemy) {
  const { x, y, r } = enemy;
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : '#7e8bff';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(178, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  for (const dx of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// `seconds` sert aux petites animations (flamme du vaisseau)
export function draw(ctx, game, seconds) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#050a24');
  sky.addColorStop(1, '#1d2b64');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of game.stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + star.size * 0.3})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  for (const enemy of game.enemies) {
    if (enemy.type === 'ufo') drawUfo(ctx, enemy);
    else drawRock(ctx, enemy);
  }

  ctx.fillStyle = '#fff176';
  for (const bullet of game.bullets) ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 12);

  for (const particle of game.particles) {
    ctx.fillStyle = `rgba(255, 183, 77, ${Math.max(0, particle.life / particle.maxLife)})`;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  }

  // Le vaisseau clignote pendant qu'il est protégé
  if (game.invulnerable === 0 || Math.floor(game.invulnerable * 10) % 2 === 0) {
    drawShipShape(ctx, game.shipX, SHIP.y, 1, 0.5 + 0.3 * Math.sin(seconds * 40));
  }

  // Informations en haut de l'écran
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${getScore(game)}`, 12, 26);
  ctx.font = '14px Verdana, sans-serif';
  ctx.fillText(`Temps ${formatTime(game.time)}`, 12, 46);
  ctx.textAlign = 'center';
  ctx.fillText(`Niveau ${game.level}`, WIDTH / 2, 26);
  for (let i = 0; i < START_LIVES; i++) {
    ctx.globalAlpha = i < game.lives ? 1 : 0.2;
    drawShipShape(ctx, WIDTH - 20 - i * 24, 24, 0.45);
  }
  ctx.globalAlpha = 1;

  if (game.banner > 0 && !game.over) {
    ctx.globalAlpha = Math.min(1, game.banner);
    ctx.font = 'bold 40px Verdana, sans-serif';
    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(`Niveau ${game.level} !`, WIDTH / 2, HEIGHT / 2);
    ctx.globalAlpha = 1;
  }
}
