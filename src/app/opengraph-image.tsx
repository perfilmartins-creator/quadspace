import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        <div
          style={{ display: "flex", alignItems: "center", gap: 16 }}
        >
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          <span>Suas ideias encontraram</span>
          <span>um lugar.</span>
        </div>
      </div>
    ),
    size
  );
}
