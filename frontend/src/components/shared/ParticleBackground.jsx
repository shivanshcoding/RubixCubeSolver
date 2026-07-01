"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Interactive particle background with cursor-reactive physics.
 *
 * Particles are attracted to the cursor and form connection lines.
 * A glowing aura follows the mouse for premium feel.
 */
export default function ParticleBackground({ particleCount = 80, className = "" }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  const COLORS = [
    "245, 158, 11",  // amber
    "251, 191, 36",  // amber-light
    "249, 115, 22",  // orange
    "59, 130, 246",  // blue
    "96, 165, 250",  // blue-light
    "139, 92, 246",  // violet
  ];

  const initParticles = useCallback((width, height) => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseVx: (Math.random() - 0.5) * 0.4,
        baseVy: (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        baseOpacity: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    return particles;
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    setCanvasSize();
    particlesRef.current = initParticles(width, height);

    const handleResize = () => {
      setCanvasSize();
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
        mouseRef.current.active = true;
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    const MOUSE_RADIUS = 200;
    const CONNECTION_DIST = 150;
    const MOUSE_CONNECTION_DIST = 250;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const time = Date.now() * 0.001;

      // Draw mouse aura glow
      if (mouse.active) {
        const gradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, MOUSE_RADIUS
        );
        gradient.addColorStop(0, "rgba(245, 158, 11, 0.08)");
        gradient.addColorStop(0.4, "rgba(249, 115, 22, 0.04)");
        gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(
          mouse.x - MOUSE_RADIUS,
          mouse.y - MOUSE_RADIUS,
          MOUSE_RADIUS * 2,
          MOUSE_RADIUS * 2
        );
      }

      // Update and draw particles
      particlesRef.current.forEach((p) => {
        // Pulse animation
        p.pulsePhase += p.pulseSpeed;
        const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulsePhase);

        // Mouse interaction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (1 - dist / MOUSE_RADIUS) * 0.02;
            p.vx += dx * force;
            p.vy += dy * force;
            // Brighten particles near cursor
            p.opacity = Math.min(p.baseOpacity + (1 - dist / MOUSE_RADIUS) * 0.5, 1);
          } else {
            p.opacity += (p.baseOpacity - p.opacity) * 0.02;
          }
        } else {
          p.opacity += (p.baseOpacity - p.opacity) * 0.02;
        }

        // Apply friction and drift back to base velocity
        p.vx += (p.baseVx - p.vx) * 0.01;
        p.vy += (p.baseVy - p.vy) * 0.01;
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Draw particle with glow
        const drawRadius = p.radius * pulseFactor;
        const glow = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, drawRadius * 3
        );
        glow.addColorStop(0, `rgba(${p.color}, ${p.opacity})`);
        glow.addColorStop(0.5, `rgba(${p.color}, ${p.opacity * 0.3})`);
        glow.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections between nearby particles
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = 0.12 * (1 - dist / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Draw connections from particles to mouse
        if (mouse.active) {
          const a = particles[i];
          const dx = mouse.x - a.x;
          const dy = mouse.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_CONNECTION_DIST) {
            const alpha = 0.15 * (1 - dist / MOUSE_CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`particle-container ${className}`}
      aria-hidden="true"
    />
  );
}
