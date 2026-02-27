const getSupabaseEnv = () => {
  const env =
    (typeof globalThis !== "undefined" && globalThis.process?.env) || {};
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

const getAuthKey = ({ useServiceRole = false } = {}) => {
  const { supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();
  if (useServiceRole) {
    if (!supabaseServiceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required for server-side privileged operations."
      );
    }
    return supabaseServiceRoleKey;
  }
  return supabaseAnonKey;
};

const fetchFromSupabase = async (
  path,
  { method = "GET", body, useServiceRole = false } = {}
) => {
  const { supabaseUrl } = getSupabaseEnv();
  const authKey = getAuthKey({ useServiceRole });
  const url = `${supabaseUrl}/rest/v1/${path}`;

  const headers = {
    apikey: authKey,
    Authorization: `Bearer ${authKey}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) return [];
  return response.json();
};

const fetchSharedRead = async (path) => {
  try {
    return await fetchFromSupabase(path, { useServiceRole: true });
  } catch (error) {
    const message = error?.message || "";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY is required")) {
      return fetchFromSupabase(path);
    }
    throw error;
  }
};

export const getSharedResultByCode = async (shareCode) => {
  const code = (shareCode || "").trim();
  if (!code) return null;

  const sharedRows = await fetchSharedRead(
    `shared_results?select=share_code,wpm,accuracy,mode,user_id,typing_history_id,created_at&share_code=eq.${encodeURIComponent(
      code
    )}&limit=1`
  );

  const shared = Array.isArray(sharedRows) ? sharedRows[0] : null;
  if (!shared) return null;

  let owner = null;
  if (shared.user_id) {
    try {
      const profileRows = await fetchSharedRead(
        `profiles?select=display_name&id=eq.${encodeURIComponent(shared.user_id)}&limit=1`
      );
      owner = Array.isArray(profileRows) ? profileRows[0] : null;
    } catch (error) {
      console.error("Failed to fetch shared profile:", error);
    }
  }

  let history = null;
  if (shared.typing_history_id) {
    try {
      const historyRows = await fetchSharedRead(
        `typing_history?select=mode,sub_mode,original_text,typed_text,wpm,accuracy,errors,duration_seconds,mistake_indices,corrections,created_at&id=eq.${encodeURIComponent(
          shared.typing_history_id
        )}&limit=1`
      );
      history = Array.isArray(historyRows) ? historyRows[0] : null;
    } catch (error) {
      console.error("Failed to fetch shared typing history:", error);
    }
  }

  return {
    ...shared,
    owner_name: owner?.display_name || "",
    history: history || null,
  };
};

export const insertTypingHistory = async (row) => {
  const insertedRows = await fetchFromSupabase("typing_history", {
    method: "POST",
    body: row,
    useServiceRole: true,
  });
  return Array.isArray(insertedRows) ? insertedRows[0] : null;
};

export const insertSharedResult = async (row) => {
  const insertedRows = await fetchFromSupabase("shared_results", {
    method: "POST",
    body: row,
    useServiceRole: true,
  });
  return Array.isArray(insertedRows) ? insertedRows[0] : null;
};
