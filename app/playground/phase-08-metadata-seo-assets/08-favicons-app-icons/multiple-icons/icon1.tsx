import { ImageResponse } from "next/og";

export const size = { width: 16, height: 16 };
export const contentType = "image/png";

export default function Icon1() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 12,
          background: "#dc2626",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        1
      </div>
    ),
    { ...size }
  );
}
