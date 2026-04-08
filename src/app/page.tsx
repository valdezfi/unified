"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandHero } from "@/components/brand-hero";
import { ProductSection } from "@/components/product-section";
import { StoreNav } from "@/components/store-nav";

function HomeContent() {
  const searchParams = useSearchParams();
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [tikTokLinked, setTikTokLinked] = useState(false);
  const [tikTokOAuthBanner, setTikTokOAuthBanner] = useState<string | null>(null);

  const workspaceId = process.env.NEXT_PUBLIC_UNIFIED_WORKSPACE_ID;

  const refreshTikTokStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/tiktok/status");
      const j = (await r.json()) as { linked?: boolean };
      setTikTokLinked(Boolean(j.linked));
    } catch {
      setTikTokLinked(false);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setConnectionId(id);
      localStorage.setItem("demo_id", id);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    const saved = localStorage.getItem("demo_id");
    setConnectionId(saved ?? "");
  }, [searchParams]);

  useEffect(() => {
    void refreshTikTokStatus();
  }, [refreshTikTokStatus, connectionId]);

  useEffect(() => {
    const linked = searchParams.get("tiktok_linked") === "1";
    const tikTokErr = searchParams.get("tiktok_error");
    if (linked) {
      void refreshTikTokStatus();
      setTikTokOAuthBanner("TikTok Ads account linked.");
    }
    if (tikTokErr) {
      setTikTokOAuthBanner(`TikTok link failed: ${tikTokErr}`);
    }
    if (linked || tikTokErr) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, refreshTikTokStatus]);

  const startAuth = () => {
    if (!workspaceId) return;
    const redirect = window.location.origin;
    const url = `https://api.unified.to/unified/integration/auth/${workspaceId}/shopify?redirect=true&success_redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <StoreNav
        connectionId={connectionId || undefined}
        tikTokLinked={tikTokLinked}
      />
      {tikTokOAuthBanner ? (
        <p className="border-b border-black/10 bg-[#FAF9F6] px-6 py-2 font-sans text-sm text-[#1A1A1A]/85 md:px-10">
          {tikTokOAuthBanner}
        </p>
      ) : null}
      <BrandHero
        onConnect={startAuth}
        workspaceReady={Boolean(workspaceId)}
      />
      {connectionId ? (
        <ProductSection connectionId={connectionId} tikTokLinked={tikTokLinked} />
      ) : null}
    </div>
  );
}

function HeroSuspenseFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] md:flex-row">
      <div className="min-h-[40vh] flex-1 bg-[#E4F9A0] md:min-h-screen" />
      <div className="min-h-[40vh] flex-1 bg-[#FAF9F6] md:min-h-screen" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<HeroSuspenseFallback />}>
      <HomeContent />
    </Suspense>
  );
}
