import { ImageResponse } from "next/og";
import { crestSvg } from "./crestSvg";

/** Racing green tile with the brass crest. */
export function appIcon(px: number) {
  const src = `data:image/svg+xml;base64,${Buffer.from(crestSvg()).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2F4A3A" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={px * 0.66} height={px * 0.66} alt="" />
      </div>
    ),
    { width: px, height: px },
  );
}
