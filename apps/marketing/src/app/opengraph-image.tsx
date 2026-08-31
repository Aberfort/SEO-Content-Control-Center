import { ImageResponse } from "next/og";

export const alt = "Content Signal — WordPress SEO audit and content operations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0b0d0f",
          color: "#f5f6f7",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              alignItems: "center",
              background: "#f5f6f7",
              borderRadius: "10px",
              color: "#0b0d0f",
              display: "flex",
              fontSize: "26px",
              fontWeight: 700,
              height: "48px",
              justifyContent: "center",
              width: "48px"
            }}
          >
            CS
          </div>
          <div style={{ fontSize: "26px", letterSpacing: "-0.01em" }}>Content Signal</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08
            }}
          >
            Run a WordPress SEO audit that ends in shipped work.
          </div>
          <div style={{ color: "#9aa1a8", fontSize: "27px", lineHeight: 1.4 }}>
            Content evidence, Search Console signals, and a review-first backlog.
          </div>
        </div>

        <div style={{ color: "#9aa1a8", display: "flex", fontSize: "23px", gap: "28px" }}>
          <span>getcontentsignal.com</span>
          <span>·</span>
          <span>Free WordPress plugin</span>
        </div>
      </div>
    ),
    size
  );
}
