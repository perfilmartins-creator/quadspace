"use client";

import { useEffect, useRef } from "react";
import { colorHex } from "@/lib/crew/constants";
import { drawBody, drawCharacter } from "./render";

type Props = { color: string; size?: number; dead?: boolean; ghost?: boolean; className?: string };

/** Personagem desenhado em um canvas pequeno (listas, reunião, resultados). */
export function CharacterIcon({ color, size = 44, dead = false, ghost = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform((dpr * size) / 64, 0, 0, (dpr * size) / 64, 0, 0);
    ctx.clearRect(0, 0, 64, 64);
    const hex = colorHex(color);
    if (dead) drawBody(ctx, 32, 48, hex, 0);
    else drawCharacter(ctx, 32, 58, hex, { facing: 1, walk: 0, moving: false, ghost, alpha: ghost ? 0.55 : 1 });
  }, [color, size, dead, ghost]);

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: size, height: size }} />;
}
