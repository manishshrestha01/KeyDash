import { getSharedResultByCode } from "./_lib/shared-result.js";

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getOrigin = (req) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
};

export default async function handler(req, res) {
  const rawCode = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  const shareCode = (rawCode || "").trim();

  if (!shareCode) {
    res.status(400).send("Missing share code.");
    return;
  }

  const origin = getOrigin(req);
  const appUrl = `${origin}/results/${encodeURIComponent(shareCode)}`;
  const ogImageUrl = `${origin}/api/og?code=${encodeURIComponent(shareCode)}`;

  let sharedResult = null;
  try {
    sharedResult = await getSharedResultByCode(shareCode);
  } catch (error) {
    console.error("Failed to fetch shared result for metadata:", error);
  }

  const wpm = sharedResult?.history?.wpm ?? sharedResult?.wpm;
  const accuracy = sharedResult?.history?.accuracy ?? sharedResult?.accuracy;
  const ownerLabel = sharedResult?.owner_name ? `${sharedResult.owner_name} • ` : "";
  const title = wpm
    ? `${ownerLabel}${wpm} WPM on KeyDash`
    : "KeyDash Shared Result";
  const description = wpm
    ? `Typing result: ${wpm} WPM with ${Number(accuracy || 0).toFixed(
        1
      )}% accuracy. Check it out on KeyDash.`
    : "View this shared typing result on KeyDash.";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": escapeHtml(title),
    "description": escapeHtml(description),
    "url": appUrl,
    "publisher": {
      "@type": "Organization",
      "name": "KeyDash",
      "url": origin,
      "logo": `${origin}/logo.svg`
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": appUrl
    }
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${appUrl}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="KeyDash" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${appUrl}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>

    <meta http-equiv="refresh" content="0;url=${appUrl}" />
  </head>
  <body>
    <p>Redirecting to shared result...</p>
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  res.status(200).send(html);
}
