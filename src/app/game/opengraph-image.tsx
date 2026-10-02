import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "QUAD BOUNCE — minigame da QUAD SPACE";

export default function OpengraphImage() {
  const mark = readFileSync(
    join(process.cwd(), "public/brand/estrelas-branco.png")
  ).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          color: "#ffffff",
          padding: "80px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={`data:image/png;base64,${mark}`}
            width={72}
            height={21}
            style={{ objectFit: "contain" }}
            alt=""
          />
          <span style={{ fontSize: 32, letterSpacing: -0.5 }}>
            {site.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, letterSpacing: 14 }}>QUAD</span>
            <span style={{ fontSize: 150, lineHeight: 1, letterSpacing: -4 }}>
              BOUNCE
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "#ffffff",
                boxShadow: "0 0 40px rgba(255,255,255,0.45)",
              }}
            />
            <div style={{ width: 150, height: 8, borderRadius: 3, background: "#ffffff" }} />
          </div>
        </div>
      </div>
    ),
    size
  );
}
