import React from "react";
import { ImageResponse } from "@vercel/og";
import { getSharedResultByCode } from "./_lib/shared-result.js";

export const config = {
  runtime: "edge",
};

const h = React.createElement;

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMode = (rawMode = "") => {
  if (!rawMode) return "Typing";
  return rawMode
    .replace(/[_:]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const shareCode = (searchParams.get("code") || "").trim();

  if (!shareCode) {
    return new Response("Missing share code", { status: 400 });
  }

  let sharedResult = null;
  try {
    sharedResult = await getSharedResultByCode(shareCode);
  } catch (error) {
    console.error("OG shared result fetch failed:", error);
  }

  const wpm = toNumber(sharedResult?.history?.wpm ?? sharedResult?.wpm, 0);
  const accuracy = toNumber(
    sharedResult?.history?.accuracy ?? sharedResult?.accuracy,
    0
  ).toFixed(1);
  const mode = formatMode(sharedResult?.history?.mode || sharedResult?.mode);
  const owner = sharedResult?.owner_name || "KeyDash Player";
  const durationSeconds = toNumber(sharedResult?.history?.duration_seconds, 0).toFixed(1);

  const content = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px",
        color: "#f8fafc",
        background:
          "radial-gradient(circle at 90% -10%, rgba(251,191,36,0.30), transparent 44%), radial-gradient(circle at 0% 100%, rgba(59,130,246,0.26), transparent 42%), linear-gradient(135deg, #0a0f1a 0%, #131d31 45%, #1b2740 100%)",
        fontFamily:
          "SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      },
    },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "10px" } },
        h(
          "div",
          {
            style: {
              fontSize: "26px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#fde68a",
              fontWeight: 700,
            },
          },
          "KeyDash Result"
        ),
        h(
          "div",
          { style: { fontSize: "36px", fontWeight: 700, color: "#f1f5f9" } },
          owner
        )
      ),
      h(
        "div",
        {
          style: {
            padding: "10px 18px",
            borderRadius: "999px",
            border: "1px solid rgba(251,191,36,0.45)",
            backgroundColor: "rgba(251,191,36,0.12)",
            color: "#fde68a",
            fontSize: "22px",
            fontWeight: 600,
          },
        },
        mode
      )
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "baseline", gap: "16px" } },
      h(
        "div",
        {
          style: {
            fontSize: "136px",
            lineHeight: 1,
            fontWeight: 800,
            color: "#facc15",
          },
        },
        `${wpm}`
      ),
      h(
        "div",
        { style: { fontSize: "40px", color: "#fef9c3", fontWeight: 600 } },
        "WPM"
      )
    ),
    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "14px",
        },
      },
      ...[
        { label: "Accuracy", value: `${accuracy}%`, color: "#86efac" },
        { label: "Duration", value: `${durationSeconds}s`, color: "#c4b5fd" },
        { label: "Code", value: shareCode, color: "#fef08a" },
      ].map((item) =>
        h(
          "div",
          {
            style: {
              borderRadius: "18px",
              padding: "14px 18px",
              border: "1px solid rgba(255,255,255,0.16)",
              backgroundColor: "rgba(0,0,0,0.24)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            },
          },
          h(
            "div",
            {
              style: {
                fontSize: "18px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
                fontWeight: 600,
              },
            },
            item.label
          ),
          h(
            "div",
            { style: { fontSize: "34px", fontWeight: 700, color: item.color } },
            item.value
          )
        )
      )
    )
  );

  return new ImageResponse(content, {
    width: 1200,
    height: 630,
  });
}
