// Könnyű konfetti: színes papírcsíkok + téma emojik egy teljes képernyős vásznon.

const COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
let particles = [];
let running = false;

export function confetti({ emojis = ['⭐'], count = 120 } = {}) {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (let i = 0; i < count; i++) {
    const isEmoji = i % 5 === 0;
    particles.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 22 - 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: isEmoji ? 34 + Math.random() * 20 : 8 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      emoji: isEmoji ? emojis[i % emojis.length] : null,
      life: 0,
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(() => tick(ctx));
  }
}

function tick(ctx) {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.y < innerHeight + 60 && p.life < 400);
  for (const p of particles) {
    p.life++;
    p.vy += 0.55;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.emoji) {
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }
  if (particles.length) requestAnimationFrame(() => tick(ctx));
  else {
    running = false;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
}
