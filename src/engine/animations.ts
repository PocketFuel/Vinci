import gsap from "gsap";
import type { AnimationSpec, SceneDocument } from "./types";

export const animationRecipes: Record<AnimationSpec["type"], { className: string; css: string }> = {
  pulse: {
    className: "anim-pulse",
    css: `
      .anim-pulse { animation: pulse var(--dur, 2s) ease-in-out infinite; transform-origin: center; }
      @keyframes pulse { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
    `,
  },
  flow: {
    className: "anim-flow",
    css: `
      .anim-flow { stroke-dasharray: 8 10; animation: flow var(--dur, 2s) linear infinite; }
      @keyframes flow { to { stroke-dashoffset: -36; } }
    `,
  },
  orbit: {
    className: "anim-orbit",
    css: `
      .anim-orbit { animation: orbit var(--dur, 8s) linear infinite; transform-origin: center; }
      @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `,
  },
  growth: {
    className: "anim-growth",
    css: `
      .anim-growth { animation: growth var(--dur, 5s) ease-in-out infinite; transform-origin: center bottom; }
      @keyframes growth { 0%,100% { transform: scaleY(.9); } 50% { transform: scaleY(1); } }
    `,
  },
  "energy-flow": {
    className: "anim-energy-flow",
    css: `
      .anim-energy-flow { stroke-dasharray: 10 12; animation: energy-flow var(--dur, 2.2s) linear infinite; }
      @keyframes energy-flow { to { stroke-dashoffset: -52; } }
    `,
  },
  "charge-cycle": {
    className: "anim-charge-cycle",
    css: `
      .anim-charge-cycle { animation: charge-cycle var(--dur, 3.2s) ease-in-out infinite; transform-origin: center; }
      @keyframes charge-cycle { 0%,100% { opacity: .62; } 50% { opacity: 1; } }
    `,
  },
  "reaction-split": {
    className: "anim-reaction-split",
    css: `
      .anim-reaction-split { animation: reaction-split var(--dur, 2.8s) ease-in-out infinite; transform-origin: center; }
      @keyframes reaction-split { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    `,
  },
  "network-pulse": {
    className: "anim-network-pulse",
    css: `
      .anim-network-pulse { animation: network-pulse var(--dur, 2.4s) linear infinite; }
      @keyframes network-pulse { 0% { opacity: .3; } 50% { opacity: .95; } 100% { opacity: .3; } }
    `,
  },
  "growth-wave": {
    className: "anim-growth-wave",
    css: `
      .anim-growth-wave { animation: growth-wave var(--dur, 5.5s) ease-in-out infinite; transform-origin: center bottom; }
      @keyframes growth-wave { 0%,100% { transform: scaleY(.84); } 50% { transform: scaleY(1.04); } }
    `,
  },
};

export function animationStyleBlock(): string {
  return Object.values(animationRecipes)
    .map((recipe) => recipe.css)
    .join("\n");
}

export function mountGsapRuntime(scene: SceneDocument, host: HTMLElement): () => void {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return () => {};
  }

  const timelines: gsap.core.Timeline[] = [];

  const ctx = gsap.context(() => {
    scene.animations.forEach((animation) => {
      if (animation.engine !== "gsap") {
        return;
      }

      const targetIds =
        animation.targets?.map((target) => target.nodeId) ??
        animation.targetNodeIds;

      const selectors = [...new Set(targetIds.map((targetId) => `#node-${targetId}`))];
      const elements = selectors
        .map((selector) => host.querySelector(selector))
        .filter((entry): entry is Element => Boolean(entry));

      if (elements.length === 0) {
        return;
      }

      const timeline = gsap.timeline({
        repeat: animation.repeat === "indefinite" ? -1 : Number(animation.repeat),
        defaults: {
          duration: Math.max(0.2, animation.durationMs / 1000),
          ease: animation.easing === "linear" ? "none" : "power1.inOut",
        },
      });

      const flavor = animation.timeline ?? animation.type;

      switch (flavor) {
        case "flow":
        case "energy-flow":
        case "network-pulse":
          timeline.fromTo(
            elements,
            { strokeDashoffset: 0, opacity: 0.5 },
            { strokeDashoffset: -52, opacity: 1, stagger: 0.08 },
            0
          );
          timeline.to(elements, { opacity: 0.62, stagger: 0.08 }, ">");
          break;
        case "charge-cycle":
        case "pulse":
          timeline.fromTo(elements, { opacity: 0.6, scale: 0.96 }, { opacity: 1, scale: 1.04, stagger: 0.1 }, 0);
          timeline.to(elements, { opacity: 0.7, scale: 1, stagger: 0.1 }, ">");
          break;
        case "reaction-split":
          timeline.fromTo(elements, { scale: 0.97 }, { scale: 1.06, stagger: 0.1 }, 0);
          timeline.to(elements, { scale: 1, stagger: 0.1 }, ">");
          break;
        case "orbit":
          timeline.fromTo(elements, { rotate: 0, transformOrigin: "50% 50%" }, { rotate: 360, stagger: 0.06 }, 0);
          break;
        case "growth-wave":
        case "growth":
          timeline.fromTo(
            elements,
            { scaleY: 0.88, transformOrigin: "50% 100%" },
            { scaleY: 1.03, stagger: 0.08 },
            0
          );
          timeline.to(elements, { scaleY: 0.95, stagger: 0.08 }, ">");
          break;
        default:
          timeline.fromTo(elements, { opacity: 0.68 }, { opacity: 1, yoyo: true }, 0);
      }

      timelines.push(timeline);
    });
  }, host);

  const onVisibility = () => {
    timelines.forEach((timeline) => {
      if (document.hidden) {
        timeline.pause();
      } else {
        timeline.play();
      }
    });
  };

  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    timelines.forEach((timeline) => timeline.kill());
    ctx.revert();
  };
}
