/**
 * _lib/google.ts
 * ===============
 * Server-side Google API helpers shared by the OCR pipeline functions.
 *
 * Credential sources (Edge Function secrets — NEVER client-side):
 *   GOOGLE_CREDENTIALS  raw service-account JSON for Cloud Vision OCR
 *   CUSTOMIMAGE         Custom Search credentials. Accepts either:
 *                         • a service-account JSON (bearer-token auth), or
 *                         • {"api_key": "...", "cx": "..."} / {"key": "..."}
 *   GOOGLE_CSE_ID       search-engine id (cx) when CUSTOMIMAGE has none
 *   GOOGLE_CSE_API_KEY  legacy fallback API key (used by image-search fn)
 *
 * Access tokens are minted with a self-signed RS256 JWT (WebCrypto) and
 * cached in module scope until ~1 min before expiry.
 */

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

const tokenCache = new Map<string, CachedToken>();

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function parseServiceAccount(raw: string | undefined | null): ServiceAccount | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "service_account" && parsed.private_key && parsed.client_email) {
      return parsed as ServiceAccount;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Mint (or reuse) an OAuth2 access token for a service account + scope set.
 */
export async function getGoogleAccessToken(
  sa: ServiceAccount,
  scopes: string[],
): Promise<string> {
  const cacheKey = `${sa.client_email}|${scopes.join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(" "),
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token exchange returned no access_token");

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  });
  return data.access_token;
}

// ─── Cloud Vision OCR ────────────────────────────────────────────────────

export interface VisionOcrResult {
  text: string;
  confidence: number | null; // 0..1 page-level confidence when available
}

/**
 * Run DOCUMENT_TEXT_DETECTION on a base64-encoded image using the
 * GOOGLE_CREDENTIALS service account.
 */
export async function visionDocumentOcr(imageBase64: string): Promise<VisionOcrResult> {
  const sa = parseServiceAccount(Deno.env.get("GOOGLE_CREDENTIALS"));
  if (!sa) throw new Error("GOOGLE_CREDENTIALS secret is missing or not a service-account JSON");

  const token = await getGoogleAccessToken(sa, [
    "https://www.googleapis.com/auth/cloud-vision",
  ]);

  const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en", "vi"] },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Vision API error (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  if (data.responses?.[0]?.error) {
    throw new Error(`Vision API: ${data.responses[0].error.message}`);
  }

  // Average block confidence when the API provides it.
  let confidence: number | null = null;
  const pages = annotation?.pages;
  if (Array.isArray(pages) && pages.length) {
    const confs: number[] = [];
    for (const p of pages) {
      for (const b of p.blocks ?? []) {
        if (typeof b.confidence === "number") confs.push(b.confidence);
      }
    }
    if (confs.length) confidence = confs.reduce((a, c) => a + c, 0) / confs.length;
  }

  return { text: annotation?.text ?? "", confidence };
}

// ─── Custom Search image fetch ───────────────────────────────────────────

export interface CseImage {
  url: string;
  thumb: string;
  alt: string;
  source: "google";
}

/**
 * Fetch context-appropriate images for a word using the CUSTOMIMAGE
 * credentials. Supports both auth shapes; falls back to the legacy
 * GOOGLE_CSE_API_KEY secret so existing deployments keep working.
 */
export async function customSearchImages(query: string, count = 3): Promise<CseImage[]> {
  // The deployed secret is lowercase `customimage`; accept both spellings.
  const rawCreds = Deno.env.get("CUSTOMIMAGE") ?? Deno.env.get("customimage");
  const num = Math.min(Math.max(count, 1), 10);

  let cx = Deno.env.get("GOOGLE_CSE_ID") || "";
  let apiKey = "";
  let bearer = "";

  const sa = parseServiceAccount(rawCreds);
  if (sa) {
    bearer = await getGoogleAccessToken(sa, ["https://www.googleapis.com/auth/cse"]);
  } else if (rawCreds) {
    try {
      const parsed = JSON.parse(rawCreds);
      apiKey = parsed.api_key || parsed.key || "";
      cx = parsed.cx || parsed.cse_id || cx;
    } catch {
      apiKey = rawCreds.trim(); // raw API key string
    }
  }
  if (!apiKey && !bearer) apiKey = Deno.env.get("GOOGLE_CSE_API_KEY") || "";
  if (!cx || (!apiKey && !bearer)) {
    console.warn("customSearchImages: CUSTOMIMAGE / GOOGLE_CSE_ID not fully configured");
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    searchType: "image",
    num: String(num),
    safe: "active",
    imgSize: "medium",
    cx,
  });
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
  });
  if (!res.ok) {
    console.warn(`customSearchImages: CSE error (${res.status}): ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return items
    .map((it) => ({
      url: String(it.link || ""),
      thumb: String(it.image?.thumbnailLink || it.link || ""),
      alt: String(it.title || query),
      source: "google" as const,
    }))
    .filter((r) => r.url);
}
