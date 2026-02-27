const getSupabaseEnv = () => {
  const env =
    (typeof globalThis !== "undefined" && globalThis.process?.env) || {};
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
};

const fetchFromSupabase = async (path) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/rest/v1/${path}`;

  const response = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`);
  }

  return response.json();
};

export const getSharedResultByCode = async (shareCode) => {
  const code = (shareCode || "").trim();
  if (!code) return null;

  const sharedRows = await fetchFromSupabase(
    `shared_results?select=share_code,wpm,accuracy,mode,user_id,typing_history_id,created_at&share_code=eq.${encodeURIComponent(
      code
    )}&limit=1`
  );

  const shared = Array.isArray(sharedRows) ? sharedRows[0] : null;
  if (!shared) return null;

  let owner = null;
  if (shared.user_id) {
    const profileRows = await fetchFromSupabase(
      `profiles?select=display_name&id=eq.${encodeURIComponent(shared.user_id)}&limit=1`
    );
    owner = Array.isArray(profileRows) ? profileRows[0] : null;
  }

  let history = null;
  if (shared.typing_history_id) {
    const historyRows = await fetchFromSupabase(
      `typing_history?select=mode,sub_mode,original_text,typed_text,wpm,accuracy,errors,duration_seconds,created_at&id=eq.${encodeURIComponent(
        shared.typing_history_id
      )}&limit=1`
    );
    history = Array.isArray(historyRows) ? historyRows[0] : null;
  }

  return {
    ...shared,
    owner_name: owner?.display_name || "",
    history: history || null,
  };
};
