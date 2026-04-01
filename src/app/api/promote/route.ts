import { NextResponse } from "next/server";

type PromotePayload = {
  product: {
    id: string;
    title: string;
    imageUrl: string | null;
    productUrl: string | null;
    slug?: string | null;
    description?: string | null;
  };
};

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

class GraphApiError extends Error {
  code?: number;
  subcode?: number;
  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.name = "GraphApiError";
    this.code = code;
    this.subcode = subcode;
  }
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

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

async function graphPostForm(
    path: string,
    params: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method: "POST",
      body: new URLSearchParams(params),
    });
  
    const json = (await res.json()) as Record<string, unknown>;
    
    // ADD THIS LOGGING BLOCK
    if (!res.ok || json.error) {
      console.error(`\n❌ META API ERROR ON PATH: ${path}`);
      console.error("PARAMETERS SENT:", params);
      console.error("FULL ERROR PAYLOAD:", JSON.stringify(json.error, null, 2), "\n");
      
      const fbError = json.error as any;
      const msg = fbError?.error_user_msg || fbError?.message || "Meta Graph API request failed";
      throw new GraphApiError(msg, fbError?.code, fbError?.error_subcode);
    }
    return json;
  }

async function resolvePageId(pagesToken: string): Promise<string> {
  const url = `${GRAPH_BASE}/me?fields=id&access_token=${encodeURIComponent(pagesToken)}`;
  const res = await fetch(url);
  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok || json.error || typeof json.id !== "string") {
    throw new Error("Failed to resolve Facebook Page ID from PAGES_TOKEN");
  }
  return json.id;
}

export async function POST(req: Request) {
    const accountId = process.env.ACCOUNT_ID;
    const userAccessToken = process.env.META_USER_ACCESS_TOKEN;
    const pageId = process.env.PAGE_ID; // Use explicit Page ID
  
    if (!accountId || !userAccessToken || !pageId) {
      return NextResponse.json(
        { error: "Missing env vars. Required: ACCOUNT_ID, META_USER_ACCESS_TOKEN, PAGE_ID" },
        { status: 500 },
      );
    }

  const body = (await req.json()) as PromotePayload;
  const product = body?.product;
  const title = product?.title?.trim();
  const imageUrl = product?.imageUrl?.trim() ?? "";
  const slug = product?.slug?.trim() ?? "";
  const productUrl =
    product?.productUrl?.trim() || (slug ? buildProductUrlFromSlug(slug) ?? "" : "");
  const description = product?.description?.trim() ?? "";

  const missing: string[] = [];
  if (!title) missing.push("title");
  if (!imageUrl) missing.push("imageUrl");
  if (!productUrl) missing.push("productUrl");

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Promote missing required field(s): ${missing.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  try {

    // 1) Try upload image to Meta and get hash.
    // Some apps/accounts are blocked from adimages with (#3). In that case,
    // fallback to using the image URL directly in creative.link_data.picture.
    let imageHash: string | null = null;
    try {
      const imageResp = await graphPostForm(`/act_${accountId}/adimages`, {
        access_token: userAccessToken,
        url: imageUrl,
      });
      const images = imageResp.images as Record<
        string,
        { hash?: string } | undefined
      >;
      const firstImage = images ? Object.values(images)[0] : undefined;
      imageHash = firstImage?.hash ?? null;
    } catch (err) {
      if (!(err instanceof GraphApiError) || err.code !== 3) {
        throw err;
      }
    }

    // 2) Create ad creative
    const message = (description ? stripHtml(description) : title).slice(0, 300);
    const linkData: Record<string, unknown> = {
      link: productUrl,
      message,
      call_to_action: { type: "SHOP_NOW" },
    };
    if (imageHash) linkData.image_hash = imageHash;
    else linkData.picture = imageUrl;

    const creativeResp = await graphPostForm(`/act_${accountId}/adcreatives`, {
      access_token: userAccessToken,
      name: `Creative - ${title}`.slice(0, 100),
      object_story_spec: JSON.stringify({
        page_id: pageId, // Now passing the exact integer ID
        link_data: linkData,
      }),
    });
    const creativeId = creativeResp.id as string | undefined;
    if (!creativeId) throw new Error("Failed to create ad creative");

    // 3) Create campaign (paused)
    const campaignResp = await graphPostForm(`/act_${accountId}/campaigns`, {
      access_token: userAccessToken,
      name: `Campaign - ${title}`.slice(0, 100),
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      is_adset_budget_sharing_enabled: "false",
      special_ad_categories: "NONE",
    });
    const campaignId = campaignResp.id as string | undefined;
    if (!campaignId) throw new Error("Failed to create campaign");

    // 4) Create ad set (paused)
    const adsetResp = await graphPostForm(`/act_${accountId}/adsets`, {
      access_token: userAccessToken,
      name: `AdSet - ${title}`.slice(0, 100),
      campaign_id: campaignId,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: "1000",
      status: "PAUSED",
      targeting: JSON.stringify({
        geo_locations: { countries: ["US"] },
      }),
    });
    const adsetId = adsetResp.id as string | undefined;
    if (!adsetId) throw new Error("Failed to create ad set");

    // 5) Create ad (paused)
    const adResp = await graphPostForm(`/act_${accountId}/ads`, {
      access_token: userAccessToken,
      name: `Ad - ${title}`.slice(0, 100),
      adset_id: adsetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: "PAUSED",
    });
    const adId = adResp.id as string | undefined;
    if (!adId) throw new Error("Failed to create ad");

    return NextResponse.json({
      success: true,
      campaignId,
      adsetId,
      adId,
      creativeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Promote failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}