import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed") ?? "photoforge";
  const hue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: 56,
          color: "white",
          background: `linear-gradient(135deg, hsl(${hue} 45% 18%), #111827 55%, hsl(${(hue + 90) % 360} 55% 24%))`
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 700 }}>PhotoForge AI</div>
        <div style={{ fontSize: 24, opacity: .72, marginLeft: 18 }}>mock image</div>
      </div>
    ),
    { width: 1024, height: 1365 }
  );
}
