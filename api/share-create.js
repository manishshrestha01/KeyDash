import { insertSharedResult, insertTypingHistory } from "./_lib/shared-result.js";

const MAX_TEXT_LENGTH = 20000;
const SHARE_CODE_LENGTH = 8;
const MAX_CREATE_ATTEMPTS = 6;

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.slice(0, MAX_TEXT_LENGTH);
  return trimmed;
};

const normalizeShortText = (value, maxLength = 64) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const normalizeUuid = (value) => {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate) return null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(candidate) ? candidate : null;
};

const normalizeMistakeIndices = (value, maxIndex) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => Math.floor(toNumber(item, NaN)))
      .filter((item) => Number.isFinite(item) && item >= 0 && item < maxIndex)
  )].sort((a, b) => a - b);
};

const createShareCode = (length = SHARE_CODE_LENGTH) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

const looksLikeUniqueViolation = (error) => {
  const message = (error?.message || "").toLowerCase();
  return message.includes("23505") || message.includes("duplicate");
};

const isMissingLanguageColumnError = (error) => {
  const message = (error?.message || "").toLowerCase();
  return message.includes("column") && message.includes("language") && message.includes("does not exist");
};

const parseBody = (req) => {
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  return {};
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  let payload = {};
  try {
    payload = parseBody(req);
  } catch {
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }

  const userId = normalizeUuid(payload.userId);
  const target = normalizeText(payload.target);
  const input = normalizeText(payload.input);
  const mode = normalizeShortText(payload.mode) || "typing";
  const subMode = normalizeShortText(payload.subMode);
  const language = normalizeShortText(payload.language, 24);
  const durationSec = Number(Math.max(0, toNumber(payload.durationSec, 0)).toFixed(2));
  const wpm = Math.max(0, Math.round(toNumber(payload.wpm, 0)));
  const accuracy = Number(
    Math.min(100, Math.max(0, toNumber(payload.accuracy, 0))).toFixed(2)
  );
  const corrections = Math.max(0, Math.round(toNumber(payload.corrections, 0)));

  let inferredErrors = 0;
  if (target && input) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== target[i]) inferredErrors += 1;
    }
  }
  const mistakeIndices = normalizeMistakeIndices(
    payload.mistakenIndices,
    Math.max(input.length, target.length, 1)
  );
  const errors = mistakeIndices.length > 0 ? mistakeIndices.length : inferredErrors;
  const correctChars = Math.max(0, input.length - errors);

  const modeLabel = subMode ? `${mode}:${subMode}` : mode;
  const shouldCreateHistory =
    target.length > 0 || input.length > 0 || durationSec > 0 || wpm > 0;

  let typingHistoryId = normalizeUuid(payload.typingHistoryId);

  try {
    if (!typingHistoryId && shouldCreateHistory) {
      const historyInsertPayload = {
        user_id: userId,
        mode,
        sub_mode: subMode || null,
        original_text: target || "",
        typed_text: input || "",
        wpm,
        raw_wpm: wpm,
        accuracy,
        errors,
        correct_chars: correctChars,
        total_chars: input.length,
        duration_seconds: durationSec,
        mistake_indices: mistakeIndices,
        corrections,
        is_completed: true,
      };
      if (language) {
        historyInsertPayload.language = language;
      }

      let historyRow;
      try {
        historyRow = await insertTypingHistory(historyInsertPayload);
      } catch (error) {
        if (historyInsertPayload.language && isMissingLanguageColumnError(error)) {
          delete historyInsertPayload.language;
          historyRow = await insertTypingHistory(historyInsertPayload);
        } else {
          throw error;
        }
      }

      typingHistoryId = historyRow?.id || null;
    }

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const shareCode = createShareCode();
      try {
        await insertSharedResult({
          user_id: userId,
          typing_history_id: typingHistoryId,
          share_code: shareCode,
          wpm,
          accuracy,
          mode: modeLabel,
          image_url: null,
        });

        res.status(200).json({
          shareCode,
          typingHistoryId: typingHistoryId || null,
        });
        return;
      } catch (error) {
        if (looksLikeUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    res.status(500).json({ error: "Could not generate a unique share code." });
  } catch (error) {
    console.error("Failed to create shared result:", error);
    res.status(500).json({ error: "Unable to create share link right now." });
  }
}
