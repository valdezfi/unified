import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_BASE = "https://business-api.tiktok.com/portal/auth";

export async function GET(req: Request) {
  const appId = process.env.TIKTOK_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "TIKTOK_APP_ID is not configured." },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() ||
    `${origin}/api/auth/tiktok/callback`;

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authUrl = new URL(AUTH_BASE);
  authUrl.searchParams.set("app_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
