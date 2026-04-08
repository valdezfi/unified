export type DisplayProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  /** Direct URL to a product video file (e.g. Shopify hosted .mp4), for TikTok upload */
  productVideoUrl: string | null;
  productUrl: string | null;
  slug: string | null;
  description: string | null;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  priceLabel: string;
  /** rough hint for optional badge */
  inventoryHint?: number | null;
};

function pickString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v;
  return undefined;
}

function pickPrice(item: Record<string, unknown>): string {
  const variants = item.variants;
  if (Array.isArray(variants) && variants[0] && typeof variants[0] === "object") {
    const v = variants[0] as Record<string, unknown>;
    const price = v.price;
    const currency = pickString(v.currency) ?? "USD";
    if (typeof price === "number") {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(price);
    }
  }
  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const variants = r.variants;
    if (Array.isArray(variants) && variants[0] && typeof variants[0] === "object") {
      const v = variants[0] as Record<string, unknown>;
      const p = v.price;
      if (typeof p === "string") return p;
    }
  }
  return "—";
}

function pickImage(item: Record<string, unknown>): string | null {
  const direct =
    pickString(item.imageUrl) ??
    pickString(item.image_url) ??
    pickString(item.imageURL);
  if (direct) return direct;

  const media = item.media;
  if (Array.isArray(media) && media[0] && typeof media[0] === "object") {
    const m = media[0] as Record<string, unknown>;
    const fromMedia = pickString(m.url) ?? pickString(m.src);
    if (fromMedia) return fromMedia;
  }

  const images = item.images;
  if (Array.isArray(images) && images[0]) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      return pickString(o.url) ?? pickString(o.src) ?? null;
    }
  }
  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const rawMedia = r.media;
    if (Array.isArray(rawMedia) && rawMedia[0] && typeof rawMedia[0] === "object") {
      const m = rawMedia[0] as Record<string, unknown>;
      const fromRaw = pickString(m.url) ?? pickString(m.src);
      if (fromRaw) return fromRaw;
    }
    const img = r.image;
    if (typeof img === "object" && img && "src" in img) {
      return pickString((img as Record<string, unknown>).src) ?? null;
    }
  }
  return null;
}

function pickInventory(item: Record<string, unknown>): number | null {
  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const inv = r.total_inventory;
    if (typeof inv === "number") return inv;
    const v = r.variants;
    if (Array.isArray(v) && v[0] && typeof v[0] === "object") {
      const inv2 = (v[0] as Record<string, unknown>).inventory_quantity;
      if (typeof inv2 === "number") return inv2;
    }
  }
  return null;
}

function pickDescription(item: Record<string, unknown>): string | null {
  const direct =
    pickString(item.description) ??
    pickString(item.body_html) ??
    pickString(item.bodyHtml);
  if (direct) return direct;

  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return (
      pickString(r.description) ??
      pickString(r.body_html) ??
      pickString(r.bodyHtml) ??
      null
    );
  }
  return null;
}

function pickProductUrl(item: Record<string, unknown>): string | null {
  const direct =
    pickString(item.online_store_url) ??
    pickString(item.productUrl) ??
    pickString(item.url);
  if (direct) return direct;

  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return (
      pickString(r.online_store_url) ??
      pickString(r.productUrl) ??
      pickString(r.url) ??
      null
    );
  }
  return null;
}

function pickSlug(item: Record<string, unknown>): string | null {
  const direct = pickString(item.slug) ?? pickString(item.handle);
  if (direct) return direct;

  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return pickString(r.slug) ?? pickString(r.handle) ?? null;
  }
  return null;
}

function isLikelyDirectVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return false;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
}

function pickProductVideoUrl(item: Record<string, unknown>): string | null {
  const fromFields =
    pickString(item.product_video_url) ??
    pickString(item.productVideoUrl) ??
    pickString(item.video_url) ??
    pickString(item.videoUrl);
  if (fromFields && isLikelyDirectVideoUrl(fromFields)) return fromFields;

  const scanMedia = (nodes: unknown): string | null => {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const m = node as Record<string, unknown>;
      const mime =
        pickString(m.mime_type) ??
        pickString(m.mimeType) ??
        pickString(m.content_type);
      const url =
        pickString(m.url) ?? pickString(m.src) ?? pickString(m.originalSource);
      if (mime?.startsWith("video/") && url) return url;
      if (url && isLikelyDirectVideoUrl(url)) return url;
      const variants = m.sources;
      if (Array.isArray(variants)) {
        for (const s of variants) {
          if (!s || typeof s !== "object") continue;
          const u = pickString((s as Record<string, unknown>).url);
          if (u && isLikelyDirectVideoUrl(u)) return u;
        }
      }
    }
    return null;
  };

  const mediaHit = scanMedia(item.media);
  if (mediaHit) return mediaHit;

  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const rawDirect =
      pickString(r.product_video_url) ??
      pickString(r.productVideoUrl);
    if (rawDirect && isLikelyDirectVideoUrl(rawDirect)) return rawDirect;
    const rawMedia = scanMedia(r.media);
    if (rawMedia) return rawMedia;
  }

  return null;
}

function pickYouTubeUrl(item: Record<string, unknown>): string | null {
  const direct =
    pickString(item.youtube_url) ??
    pickString(item.youtubeUrl) ??
    pickString(item.youtube_video_url) ??
    pickString(item.youtubeVideoUrl) ??
    pickString(item.video_url) ??
    pickString(item.videoUrl) ??
    pickString(item.external_video_url) ??
    pickString(item.externalVideoUrl);

  if (direct) return direct;

  const media = item.media;
  if (Array.isArray(media)) {
    for (const node of media) {
      if (!node || typeof node !== "object") continue;
      const m = node as Record<string, unknown>;

      const embedded =
        pickString(m.embeddedUrl) ??
        pickString(m.embedded_url) ??
        pickString(m.embedUrl) ??
        pickString(m.embed_url);
      if (embedded && /youtube\.com|youtu\.be/i.test(embedded)) return embedded;

      const maybeUrl =
        pickString(m.url) ??
        pickString(m.src) ??
        pickString(m.externalUrl) ??
        pickString(m.external_url);
      if (maybeUrl && /youtube\.com|youtu\.be/i.test(maybeUrl)) return maybeUrl;

      const host = pickString(m.host);
      if (host && /youtube\.com|youtu\.be/i.test(host)) {
        const hostedUrl =
          pickString(m.url) ??
          pickString(m.src) ??
          pickString(m.externalUrl) ??
          pickString(m.external_url);
        if (hostedUrl) return hostedUrl;
      }
    }
  }

  const raw = item.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const rawDirect =
      pickString(r.youtube_url) ??
      pickString(r.youtubeUrl) ??
      pickString(r.youtube_video_url) ??
      pickString(r.youtubeVideoUrl);
    if (rawDirect) return rawDirect;

    const rawMedia = r.media;
    if (Array.isArray(rawMedia)) {
      for (const node of rawMedia) {
        if (!node || typeof node !== "object") continue;
        const m = node as Record<string, unknown>;
        const embedded =
          pickString(m.embeddedUrl) ??
          pickString(m.embedded_url) ??
          pickString(m.embedUrl) ??
          pickString(m.embed_url);
        if (embedded && /youtube\.com|youtu\.be/i.test(embedded)) return embedded;

        const maybeUrl =
          pickString(m.url) ??
          pickString(m.src) ??
          pickString(m.externalUrl) ??
          pickString(m.external_url);
        if (maybeUrl && /youtube\.com|youtu\.be/i.test(maybeUrl)) return maybeUrl;
      }
    }
  }

  return null;
}

function pickYouTubeVideoIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match =
    trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/,
    ) ?? trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);

  return match?.[1] ?? null;
}

export function parseCommerceItemsPayload(data: unknown): DisplayProduct[] {
  if (!data || typeof data !== "object") return [];
  const err = (data as Record<string, unknown>).error;
  if (typeof err === "string") return [];

  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) rows = d;
  }

  return rows
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === "object")
    .map((item, i) => {
      const id = pickString(item.id) ?? `row-${i}`;
      const title =
        pickString(item.name) ?? pickString(item.title) ?? "Untitled product";
      return {
        id,
        title,
        imageUrl: pickImage(item),
        productVideoUrl: pickProductVideoUrl(item),
        productUrl: pickProductUrl(item),
        slug: pickSlug(item),
        description: pickDescription(item),
        youtubeUrl: pickYouTubeUrl(item),
        youtubeVideoId: (() => {
          const u = pickYouTubeUrl(item);
          return u ? pickYouTubeVideoIdFromUrl(u) : null;
        })(),
        priceLabel: pickPrice(item),
        inventoryHint: pickInventory(item),
      };
    });
}
