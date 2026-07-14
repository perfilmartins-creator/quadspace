import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          width={24}
          height={24}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    size
  );
}
