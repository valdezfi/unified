"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandHero } from "@/components/brand-hero";
import { ProductSection } from "@/components/product-section";
import { StoreNav } from "@/components/store-nav";

function HomeContent() {
  const searchParams = useSearchParams();
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const workspaceId = process.env.NEXT_PUBLIC_UNIFIED_WORKSPACE_ID;

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

  const startAuth = () => {
    if (!workspaceId) return;
    const redirect = window.location.origin;
    const url = `https://api.unified.to/unified/integration/auth/${workspaceId}/shopify?redirect=true&success_redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <StoreNav connectionId={connectionId || undefined} />
      <BrandHero
        onConnect={startAuth}
        workspaceReady={Boolean(workspaceId)}
      />
      {connectionId ? <ProductSection connectionId={connectionId} /> : null}
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
