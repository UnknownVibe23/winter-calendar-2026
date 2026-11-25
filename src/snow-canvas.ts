import { SNOW_SEED, makeSnowParticles, particlePosition } from './snow';

const MAX_DPR = 2;
const SNOWFLAKE_RGB = '243, 226, 195';
const SNOWFLAKE_ALPHA = 0.8;

export interface SnowHandle {
  stop: () => void;
}

export function attachSnowfall(host: HTMLElement, day: number, seed: number = SNOW_SEED): SnowHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'snow-layer';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const maybeCtx = canvas.getContext('2d');
  if (maybeCtx === null) {
    return { stop: () => undefined };
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let width = 0;
  let height = 0;
  let dpr = 1;
  const particles = makeSnowParticles(day, seed);

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  resize();
  window.addEventListener('resize', resize);

  const start = performance.now();
  let rafId = 0;
  let stopped = false;

  function frame(nowMs: number): void {
    if (stopped) {
      return;
    }
    const tSeconds = (nowMs - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${SNOWFLAKE_RGB}, ${SNOWFLAKE_ALPHA})`;
    for (const particle of particles) {
      const pos = particlePosition(particle, tSeconds, width, height);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    rafId = window.requestAnimationFrame(frame);
  }
  rafId = window.requestAnimationFrame(frame);

  return {
    stop(): void {
      stopped = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    },
  };
}
