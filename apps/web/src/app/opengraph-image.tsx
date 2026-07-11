import { ImageResponse } from "next/og";

// Default Open Graph card — the image shown when any visaforte.com link
// is shared on LinkedIn, WhatsApp, X, etc. Rendered once at build time.
// Colours match the brand tokens in globals.css (Prussian / Saffron / Pearl).
export const alt =
  "Visa Forte — Forensic Immigration Documentation. Engineered for Passage.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRUSSIAN = "#0C2340";
const SAFFRON = "#C97B1E";
const PEARL = "#F8F4EE";

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: PRUSSIAN,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 6,
              height: 110,
              background: SAFFRON,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 92,
                color: PEARL,
                letterSpacing: "0.02em",
              }}
            >
              Visa Forte
            </div>
            <div
              style={{
                fontSize: 30,
                color: SAFFRON,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginTop: 10,
              }}
            >
              Engineered for Passage.
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            color: PEARL,
            opacity: 0.75,
            marginTop: 56,
            letterSpacing: "0.04em",
          }}
        >
          Forensic Immigration Documentation · Express Entry · PNP
        </div>
      </div>
    ),
    size
  );
}
