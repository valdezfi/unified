import { NextResponse } from "next/server";

type PromoteYouTubePayload = {
  product: {
    id: string;
    title: string;
    imageUrl: string | null;
    productUrl: string | null;
    slug?: string | null;
    description?: string | null;
  };
  youtubePayload?: {
    videoUrl: string;
    headline: string;
    longHeadline: string;
    dailyBudget: number;
    durationDays: number;
    country: string;
    interests: string[];
  };
};

function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match =
    trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/,
    ) ?? trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);

  return match?.[1] ?? null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as PromoteYouTubePayload;

  const product = body?.product;
  const youtubePayload = body?.youtubePayload;

  const missing: string[] = [];
  if (!product?.title) missing.push("product.title");
  if (!product?.productUrl && !product?.slug) missing.push("product.productUrl or product.slug");
  if (!youtubePayload?.videoUrl) missing.push("youtubePayload.videoUrl");
  if (!youtubePayload?.headline) missing.push("youtubePayload.headline");
  if (!youtubePayload?.longHeadline) missing.push("youtubePayload.longHeadline");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Promote YouTube missing required field(s): ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  const videoId = extractYouTubeVideoId(youtubePayload!.videoUrl);
  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid YouTube video URL (could not extract video id)." },
      { status: 400 },
    );
  }

  // Google Ads integration requires OAuth + account configuration.
  // We keep this route Next.js-only; wiring the actual Google Ads REST calls
  // comes after credentials are provided.
  const requiredEnvs = [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
  ];

  const envMissing = requiredEnvs.filter((k) => !process.env[k]);
  if (envMissing.length > 0) {
    return NextResponse.json(
      {
        error:
          "YouTube/Google Ads is not configured yet. Missing env vars: " +
          envMissing.join(", "),
        youtubeVideoId: videoId,
      },
      { status: 500 },
    );
  }

  // Placeholder response that still matches the desired UX flow.
  // Next step: create YoutubeVideoAsset, then create VideoCampaign/AdGroupAd.
  return NextResponse.json({
    success: true,
    status: "queued",
    youtubeVideoId: videoId,
    note:
      "Google Ads campaign creation is stubbed until we wire your credentials + exact ad format schema.",
  });
}

