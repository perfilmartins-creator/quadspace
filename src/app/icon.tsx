import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#15140f",
          color: "#fbf9f4",
          fontFamily: "serif",
          fontSize: 21,
        }}
      >
        Q
      </div>
    ),
    size
  );
}
