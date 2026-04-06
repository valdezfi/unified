import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const fromCookie = Boolean(cookieStore.get("tiktok_marketing_at")?.value);
  const fromEnv = Boolean(
    process.env.TIKTOK_ACCESS_TOKEN?.trim() &&
      process.env.TIKTOK_ADVERTISER_ID?.trim(),
  );
  const linked = fromCookie || fromEnv;
  const advertiserId =
    cookieStore.get("tiktok_marketing_adv")?.value ||
    process.env.TIKTOK_ADVERTISER_ID?.trim() ||
    null;

  return NextResponse.json({
    linked,
    advertiserIdSuffix: advertiserId
      ? advertiserId.slice(Math.max(0, advertiserId.length - 6))
      : null,
  });
}
