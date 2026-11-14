import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  /** Depth 0.2 (far) to 1 (near): near stars are bigger, brighter and move faster. */
  depth: number;
  phase: number;
  speed: number;
  hue: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const STAR_COLORS = ['255,255,255', '224,242,254', '186,230,253', '253,230,138', '216,180,254'];

/**
 * Full-page animated space background: twinkling, slowly drifting stars,
 * occasional shooting stars, coloured nebula clouds and a distant planet.
 * It sits behind everything and never catches clicks.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const shooting: ShootingStar[] = [];
    let frame = 0;
    let last = performance.now();
    let nextShot = last + 2500;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((width * height) / 2600);
      stars = Array.from({ length: count }, () => {
        const depth = 0.2 + Math.random() * 0.8;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.3 + depth * depth * 1.5,
          depth,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.6,
          hue: STAR_COLORS[Math.random() < 0.8 ? 0 : 1 + Math.floor(Math.random() * 4)],
        };
      });
    };

    const draw = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        if (!reduce) {
          // slow drift to the left, faster for near stars (parallax)
          s.x -= s.depth * 6 * dt;
          if (s.x < -2) {
            s.x = width + 2;
            s.y = Math.random() * height;
          }
        }
        const twinkle = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(now / 1000 * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.hue},${(0.25 + 0.75 * s.depth) * twinkle})`;
        ctx.fill();
        if (s.depth > 0.92) {
          // a soft glow around the brightest stars
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.hue},${0.08 * twinkle})`;
          ctx.fill();
        }
      }

      if (!reduce) {
        if (now > nextShot) {
          shooting.push({
            x: width * (0.3 + Math.random() * 0.7),
            y: height * Math.random() * 0.4,
            vx: -(500 + Math.random() * 300),
            vy: 180 + Math.random() * 140,
            life: 1,
          });
          nextShot = now + 5000 + Math.random() * 6000;
        }
        for (let i = shooting.length - 1; i >= 0; i--) {
          const m = shooting[i];
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.life -= dt * 0.9;
          if (m.life <= 0) {
            shooting.splice(i, 1);
            continue;
          }
          const tail = 0.18;
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
          grad.addColorStop(0, `rgba(224,242,254,${m.life})`);
          grad.addColorStop(1, 'rgba(224,242,254,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
          ctx.stroke();
        }
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);

    // Save battery when the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduce) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="space-nebula absolute inset-0" />
      <div className="space-planet absolute" />
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
