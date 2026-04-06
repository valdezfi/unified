import { createHash } from "node:crypto";

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

export type TikTokEnvelope<T = unknown> = {
  code: number;
  message: string;
  data?: T;
  request_id?: string;
};

export class TikTokMarketingError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "TikTokMarketingError";
    this.code = code;
  }
}

function unwrap<T>(json: TikTokEnvelope<T>, context: string): T {
  if (json.code !== 0) {
    throw new TikTokMarketingError(
      `${context}: ${json.message || "TikTok API error"}`,
      json.code,
    );
  }
  if (json.data === undefined) {
    throw new TikTokMarketingError(`${context}: missing data in response`);
  }
  return json.data;
}

export async function tiktokPostJson<T>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${TIKTOK_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": accessToken,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as TikTokEnvelope<T>;
  return unwrap(json, path);
}

export async function tiktokGetJson<T>(
  path: string,
  accessToken: string,
  query: Record<string, string>,
): Promise<T> {
  const u = new URL(`${TIKTOK_API_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v);
  }
  const res = await fetch(u.toString(), {
    headers: { "Access-Token": accessToken },
  });
  const json = (await res.json()) as TikTokEnvelope<T>;
  return unwrap(json, path);
}

export async function tiktokExchangeAuthCode(params: {
  appId: string;
  secret: string;
  authCode: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  advertiser_ids?: string[];
}> {
  const res = await fetch(`${TIKTOK_API_BASE}/oauth2/access_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: params.appId,
      secret: params.secret,
      auth_code: params.authCode,
    }),
  });
  const json = (await res.json()) as TikTokEnvelope<{
    access_token: string;
    refresh_token?: string;
    advertiser_ids?: string[];
  }>;
  return unwrap(json, "/oauth2/access_token/");
}

function collectAdvertiserIdList(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const d = raw as Record<string, unknown>;
  const lists = [
    d.list,
    d.advertisers,
    d.advertiser_list,
    d.data,
    d.accounts,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const ids: string[] = [];
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const id =
        (typeof r.advertiser_id === "string" && r.advertiser_id) ||
        (typeof r.advertiserId === "string" && r.advertiserId) ||
        (typeof r.id === "string" && r.id);
      if (id) ids.push(id);
    }
    if (ids.length) return ids;
  }
  return [];
}

/**
 * Advertiser accounts authorized for this app + token (authoritative list).
 * GET /oauth2/advertiser/get/ — every ads call must use an advertiser_id from this set.
 */
export async function listAdvertiserIdsForAccessToken(
  accessToken: string,
  appId: string,
  secret: string,
): Promise<string[]> {
  const data = await tiktokGetJson<unknown>("/oauth2/advertiser/get/", accessToken, {
    app_id: appId,
    secret,
  });
  return collectAdvertiserIdList(data);
}

/**
 * Official video upload uses multipart/form-data (see TikTok FileApi SDK).
 * Fetch remote URL (e.g. Shopify CDN) then upload bytes + MD5 signature.
 */
export async function fetchRemoteVideoForUpload(
  url: string,
): Promise<{ buffer: Buffer; fileBaseName: string }> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new TikTokMarketingError(
      `Failed to download video from URL (HTTP ${res.status})`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new TikTokMarketingError("Downloaded video is empty.");
  }
  let path = "";
  try {
    path = new URL(url).pathname.split("/").pop() || "video";
  } catch {
    path = "video";
  }
  const base = path.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "product_video";
  const fileBaseName = base.replace(/\.(mp4|mov|webm|m4v)$/i, "");
  return { buffer: buf, fileBaseName };
}

export async function uploadVideoAdMultipart(
  accessToken: string,
  advertiserId: string,
  fileBaseName: string,
  buffer: Buffer,
): Promise<unknown> {
  const videoSignature = createHash("md5").update(buffer).digest("hex");
  const form = new FormData();
  form.set("advertiser_id", advertiserId);
  form.set("upload_type", "UPLOAD_BY_FILE");
  form.set("video_signature", videoSignature);
  form.set("file_name", fileBaseName);
  const ext = ".mp4";
  const blob = new Blob([new Uint8Array(buffer)], { type: "video/mp4" });
  form.append("video_file", blob, `${fileBaseName}${ext}`);

  const res = await fetch(`${TIKTOK_API_BASE}/file/video/ad/upload/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
    },
    body: form,
  });
  const json = (await res.json()) as TikTokEnvelope<unknown>;
  return unwrap(json, "/file/video/ad/upload/");
}

function pickFirstCustomizedIdentityId(
  data: unknown,
): { identity_id: string; identity_type: string } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const rows = Array.isArray(d.list)
    ? d.list
    : Array.isArray(d.identity_list)
      ? d.identity_list
      : null;
  if (!rows?.length) return null;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id =
      typeof r.identity_id === "string"
        ? r.identity_id
        : typeof r.identityId === "string"
          ? r.identityId
          : null;
    const it =
      typeof r.identity_type === "string"
        ? r.identity_type
        : typeof r.identityType === "string"
          ? r.identityType
          : null;
    if (id && it === "CUSTOMIZED_USER") return { identity_id: id, identity_type: it };
    if (id) return { identity_id: id, identity_type: it ?? "CUSTOMIZED_USER" };
  }
  return null;
}

/**
 * Creative delivery requires an identity. Prefer an existing CUSTOMIZED_USER identity; otherwise
 * identity_type + display_name on the creative (demo path).
 */
export async function resolveTikTokCreativeIdentity(
  accessToken: string,
  advertiserId: string,
  displayName: string,
): Promise<
  | { identity_type: "CUSTOMIZED_USER"; identity_id: string }
  | { identity_type: "CUSTOMIZED_USER"; display_name: string }
> {
  const trimmed = displayName.trim().slice(0, 100) || "Advertiser";
  try {
    const data = await tiktokGetJson<unknown>("/identity/get/", accessToken, {
      advertiser_id: advertiserId,
      identity_type: "CUSTOMIZED_USER",
      page: "1",
      page_size: "20",
    });
    const picked = pickFirstCustomizedIdentityId(data);
    if (picked) {
      return {
        identity_type: "CUSTOMIZED_USER",
        identity_id: picked.identity_id,
      };
    }
  } catch {
    /* fall through to display-only identity */
  }
  return { identity_type: "CUSTOMIZED_USER", display_name: trimmed };
}

function collectRegionRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const d = raw as Record<string, unknown>;
  const candidates = [
    d.regions,
    d.region_list,
    d.list,
    d.region_info_list,
    d.data,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.filter((x): x is Record<string, unknown> =>
        Boolean(x && typeof x === "object"),
      );
    }
  }
  return [];
}

function regionId(r: Record<string, unknown>): string | undefined {
  const id =
    (typeof r.region_id === "string" && r.region_id) ||
    (typeof r.location_id === "string" && r.location_id) ||
    (typeof r.id === "string" && r.id);
  return id || undefined;
}

function regionCode(r: Record<string, unknown>): string {
  const c =
    (typeof r.region_code === "string" && r.region_code) ||
    (typeof r.code === "string" && r.code) ||
    (typeof r.iso_code === "string" && r.iso_code);
  return c ? c.toUpperCase() : "";
}

const ISO2_HINT: Record<string, string[]> = {
  US: ["us", "united states", "usa"],
  GB: ["gb", "uk", "united kingdom"],
  CA: ["ca", "canada"],
  DE: ["de", "germany"],
  FR: ["fr", "france"],
};

export async function resolveTikTokLocationIds(
  accessToken: string,
  advertiserId: string,
  isoCountry: string,
): Promise<string[]> {
  const fromEnv = process.env.TIKTOK_LOCATION_IDS;
  if (fromEnv?.trim()) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const data = await tiktokGetJson<unknown>("/search/region/", accessToken, {
    advertiser_id: advertiserId,
    language: "en",
  });

  const rows = collectRegionRows(data);
  const code = isoCountry.trim().toUpperCase();
  const hints = ISO2_HINT[code] ?? [code.toLowerCase()];

  for (const r of rows) {
    const rid = regionId(r);
    if (rid && regionCode(r) === code) return [rid];
  }
  for (const r of rows) {
    const rid = regionId(r);
    const name = typeof r.name === "string" ? r.name.toLowerCase() : "";
    if (rid && hints.some((h) => name.includes(h))) return [rid];
  }

  const blind = isoCountry.trim().toUpperCase();
  if (blind === "IN") return ["IN"];
  return ["US"];
}

export function formatTikTokScheduleTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
