export type DisplayProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
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
        priceLabel: pickPrice(item),
        inventoryHint: pickInventory(item),
      };
    });
}
