import type { AnimationSpec } from "./types";

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
};

export function animationStyleBlock(): string {
  return Object.values(animationRecipes)
    .map((recipe) => recipe.css)
    .join("\n");
}
