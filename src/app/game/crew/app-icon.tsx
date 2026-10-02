import { ImageResponse } from "next/og";

/** Ícone do app: o personagem "operador" da QUAD sobre fundo preto. */
export function appIcon(size: number) {
  const u = size / 64;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505" }}>
        <div style={{ position: "relative", width: 30 * u, height: 40 * u, display: "flex" }}>
          <div style={{ position: "absolute", left: 0, top: 4 * u, width: 30 * u, height: 32 * u, borderRadius: 12 * u, background: "linear-gradient(#ff7a6d, #c8382b)" }} />
          <div style={{ position: "absolute", left: 4 * u, top: 11 * u, width: 22 * u, height: 10 * u, borderRadius: 5 * u, background: "#0b0b0e" }} />
          <div style={{ position: "absolute", left: 9 * u, top: 15 * u, width: 13 * u, height: 2 * u, borderRadius: u, background: "#ffffff" }} />
          <div style={{ position: "absolute", left: 6 * u, top: 34 * u, width: 8 * u, height: 6 * u, borderRadius: 3 * u, background: "#7a2219" }} />
          <div style={{ position: "absolute", left: 16 * u, top: 34 * u, width: 8 * u, height: 6 * u, borderRadius: 3 * u, background: "#7a2219" }} />
          <div style={{ position: "absolute", left: 4 * u, top: -2 * u, width: 3 * u, height: 3 * u, background: "#ffffff" }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
