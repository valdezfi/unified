import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  listAdvertiserIdsForAccessToken,
  tiktokExchangeAuthCode,
} from "@/lib/tiktok-marketing";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authCode =
    url.searchParams.get("auth_code") ?? url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
  cookieStore.delete("tiktok_oauth_state");

  const baseRedirect =
    process.env.TIKTOK_OAUTH_SUCCESS_REDIRECT?.trim() ||
    new URL("/", req.url).toString();

  if (err) {
    return NextResponse.redirect(
      `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent(err)}`,
    );
  }

  if (!authCode || !state || state !== expectedState) {
    return NextResponse.redirect(
      `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent("invalid_oauth_state")}`,
    );
  }

  const appId = process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_SECRET;
  if (!appId || !secret) {
    return NextResponse.redirect(
      `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent("server_missing_tiktok_app_credentials")}`,
    );
  }

  try {
    const tok = await tiktokExchangeAuthCode({
      appId,
      secret,
      authCode,
    });
    const access = tok.access_token;
    if (!access) {
      return NextResponse.redirect(
        `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent("no_access_token")}`,
      );
    }

    const fromApi = await listAdvertiserIdsForAccessToken(access, appId, secret);
    const fromToken = tok.advertiser_ids ?? [];
    const envOverride = process.env.TIKTOK_ADVERTISER_ID?.trim();

    const advertiserId =
      envOverride ||
      fromApi[0] ||
      fromToken[0] ||
      null;

    if (!advertiserId) {
      return NextResponse.redirect(
        `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent("no_advertiser_id_grant_access_in_tiktok_app")}`,
      );
    }

    cookieStore.set("tiktok_marketing_at", access, COOKIE_OPTS);
    cookieStore.set("tiktok_marketing_adv", advertiserId, COOKIE_OPTS);
    if (tok.refresh_token) {
      cookieStore.set("tiktok_marketing_rt", tok.refresh_token, COOKIE_OPTS);
    }

    return NextResponse.redirect(
      `${baseRedirect.replace(/\/$/, "")}?tiktok_linked=1`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return NextResponse.redirect(
      `${baseRedirect.replace(/\/$/, "")}?tiktok_error=${encodeURIComponent(msg)}`,
    );
  }
}
