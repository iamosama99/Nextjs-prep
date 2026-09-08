import { ImageResponse } from "next/og";

export const alt = "OG Images Demo (Twitter)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 96,
          background: "#1d9bf0",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        OG Images Demo (Twitter)
      </div>
    ),
    { ...size }
  );
}
