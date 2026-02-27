import { getSharedResultByCode } from "./_lib/shared-result.js";

export default async function handler(req, res) {
  const rawCode = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  const shareCode = (rawCode || "").trim();

  if (!shareCode) {
    res.status(400).json({ error: "Missing share code." });
    return;
  }

  try {
    const data = await getSharedResultByCode(shareCode);
    if (!data) {
      res.status(404).json({ error: "Shared result not found." });
      return;
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    res.status(200).json({ data });
  } catch (error) {
    console.error("Failed to fetch shared result:", error);
    res.status(500).json({ error: "Failed to load shared result." });
  }
}
