import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function CustomSectionIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#eab308",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "black",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
