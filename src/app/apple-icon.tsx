import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const mark = readFileSync(
    join(process.cwd(), "public/brand/estrelas-square.png")
  ).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf9f4",
        }}
      >
        <img
          src={`data:image/png;base64,${mark}`}
          width={130}
          height={130}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    size
  );
}
