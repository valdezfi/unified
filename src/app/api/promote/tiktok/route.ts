import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  fetchRemoteVideoForUpload,
  formatTikTokScheduleTime,
  resolveTikTokCreativeIdentity,
  resolveTikTokLocationIds,
  tiktokPostJson,
  TikTokMarketingError,
  uploadVideoAdMultipart,
} from "@/lib/tiktok-marketing";

type PromoteTikTokPayload = {
  product: {
    id: string;
    title: string;
    productUrl: string | null;
    slug?: string | null;
    description?: string | null;
    productVideoUrl?: string | null;
  };
  tiktokPayload: {
    dailyBudget: number;
    durationDays: number;
    country: string;
    adText?: string;
  };
};

function normalizeStoreDomain(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function buildProductUrlFromSlug(slug: string): string | null {
  const rawDomain = process.env.LINK ?? process.env.SHOPIFY_STORE_DOMAIN;
  if (!rawDomain) return null;
  const domain = normalizeStoreDomain(rawDomain.trim());
  if (!domain) return null;
  return `https://${domain}/products/${slug}`;
}

function pickVideoId(uploadData: unknown): string | undefined {
  if (!uploadData || typeof uploadData !== "object") return undefined;
  const d = uploadData as Record<string, unknown>;
  if (typeof d.video_id === "string") return d.video_id;
  const list = d.list;
  if (Array.isArray(list) && list[0] && typeof list[0] === "object") {
    const v = (list[0] as Record<string, unknown>).video_id;
    if (typeof v === "string") return v;
  }
  return undefined;
}

function pickCampaignId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.campaign_id === "string") return d.campaign_id;
  if (typeof d.campaignId === "string") return d.campaignId;
  return undefined;
}

function pickAdGroupId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.adgroup_id === "string") return d.adgroup_id;
  if (typeof d.adgroupId === "string") return d.adgroupId;
  return undefined;
}

function pickAdIds(data: unknown): string[] | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const ids = d.ad_ids ?? d.ad_ids_list;
  if (!Array.isArray(ids)) return undefined;
  const out = ids.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get("tiktok_marketing_at")?.value ||
    process.env.TIKTOK_ACCESS_TOKEN?.trim();
  const advertiserId =
    cookieStore.get("tiktok_marketing_adv")?.value ||
    process.env.TIKTOK_ADVERTISER_ID?.trim();

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "TikTok Ads is not linked. Use “Link TikTok Ads” in the header, or set TIKTOK_ACCESS_TOKEN.",
      },
      { status: 401 },
    );
  }
  if (!advertiserId) {
    return NextResponse.json(
      {
        error:
          "Missing advertiser_id. Complete OAuth (callback stores it) or set TIKTOK_ADVERTISER_ID.",
      },
      { status: 401 },
    );
  }

  const body = (await req.json()) as PromoteTikTokPayload;
  const product = body?.product;
  const tp = body?.tiktokPayload;

  const title = product?.title?.trim();
  const slug = product?.slug?.trim() ?? "";
  const productUrl =
    product?.productUrl?.trim() ||
    (slug ? buildProductUrlFromSlug(slug) ?? "" : "");
  const videoUrl = product?.productVideoUrl?.trim() ?? "";

  const missing: string[] = [];
  if (!title) missing.push("product.title");
  if (!productUrl) missing.push("product.productUrl or product.slug");
  if (!videoUrl) missing.push("product.productVideoUrl (Shopify product video)");
  if (!tp?.country?.trim()) missing.push("tiktokPayload.country");
  if (!Number.isFinite(tp?.dailyBudget) || (tp?.dailyBudget ?? 0) <= 0) {
    missing.push("tiktokPayload.dailyBudget");
  }
  if (!Number.isFinite(tp?.durationDays) || (tp?.durationDays ?? 0) <= 0) {
    missing.push("tiktokPayload.durationDays");
  }

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Promote TikTok missing required field(s): ${missing.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const dailyBudget = tp!.dailyBudget;
  const durationDays = tp!.durationDays;
  const country = tp!.country.trim();
  const adText = (tp!.adText?.trim() || title).slice(0, 100);
  const pixelId = process.env.TIKTOK_PIXEL_ID?.trim();

  const start = new Date();
  const end = new Date(start.getTime() + durationDays * 86_400_000);

  try {
    const { buffer, fileBaseName } = await fetchRemoteVideoForUpload(videoUrl);
    const uploadData = await uploadVideoAdMultipart(
      accessToken,
      advertiserId,
      fileBaseName ||
        `${title}`.replace(/[^\w\- ]+/g, "").slice(0, 80) ||
        "product",
      buffer,
    );
    const videoId = pickVideoId(uploadData);
    if (!videoId) {
      return NextResponse.json(
        { error: "TikTok video upload did not return video_id." },
        { status: 502 },
      );
    }

    const campaignData = await tiktokPostJson<unknown>(
      "/campaign/create/",
      accessToken,
      {
        advertiser_id: advertiserId,
        campaign_name: `Campaign — ${title}`.slice(0, 512),
        objective_type: "TRAFFIC",
        budget_mode: "BUDGET_MODE_INFINITE",
        operation_status: "DISABLE",
      },
    );
    const cid = pickCampaignId(campaignData);
    if (!cid) {
      return NextResponse.json(
        { error: "TikTok campaign/create did not return campaign_id." },
        { status: 502 },
      );
    }

    const locationIds = await resolveTikTokLocationIds(
      accessToken,
      advertiserId,
      country,
    );

    const adgroupBody: Record<string, unknown> = {
      advertiser_id: advertiserId,
      campaign_id: cid,
      adgroup_name: `Ad group — ${title}`.slice(0, 512),
      promotion_type: "WEBSITE",
      budget_mode: "BUDGET_MODE_DAY",
      budget: dailyBudget,
      billing_event: "CPC",
      optimization_goal: "CLICK",
      pacing: "PACING_MODE_SMOOTH",
      placement_type: "PLACEMENT_TYPE_NORMAL",
      placements: ["PLACEMENT_TIKTOK"],
      location_ids: locationIds,
      schedule_type: "SCHEDULE_START_END",
      schedule_start_time: formatTikTokScheduleTime(start),
      schedule_end_time: formatTikTokScheduleTime(end),
      operation_status: "DISABLE",
    };
    if (pixelId) adgroupBody.pixel_id = pixelId;

    const adgroupData = await tiktokPostJson<unknown>(
      "/adgroup/create/",
      accessToken,
      adgroupBody,
    );

    const agid = pickAdGroupId(adgroupData);
    if (!agid) {
      return NextResponse.json(
        { error: "TikTok adgroup/create did not return adgroup_id." },
        { status: 502 },
      );
    }

    const identity = await resolveTikTokCreativeIdentity(
      accessToken,
      advertiserId,
      title,
    );

    const adData = await tiktokPostJson<unknown>("/ad/create/", accessToken, {
      advertiser_id: advertiserId,
      adgroup_id: agid,
      creatives: [
        {
          ad_name: `Ad — ${title}`.slice(0, 512),
          video_id: videoId,
          landing_page_url: productUrl,
          call_to_action: "SHOP_NOW",
          ad_text: adText,
          operation_status: "DISABLE",
          ...identity,
        },
      ],
    });

    const adIds = pickAdIds(adData);

    return NextResponse.json({
      success: true,
      campaignId: cid,
      adgroupId: agid,
      videoId,
      adIds: adIds ?? [],
      note: "Structures are created in DISABLE (paused) state. Enable in TikTok Ads Manager after review.",
    });
  } catch (error) {
    const message =
      error instanceof TikTokMarketingError
        ? error.message
        : error instanceof Error
          ? error.message
          : "TikTok promote failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
