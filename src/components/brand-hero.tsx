"use client";

import { useState } from "react";
import { HERO_IMAGE_ALT, HERO_IMAGE_SRC } from "@/config/brand";

type Platform = "shopify" | "woocommerce";

type Props = {
  onConnect: (platform: Platform) => void;
  workspaceReady: boolean;
  isConnected: boolean;
};

export function BrandHero({ onConnect, workspaceReady, isConnected }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("shopify");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <section className="flex flex-1 flex-col justify-center gap-6 bg-[#E4F9A0] px-8 py-8 md:px-14 md:py-12">
        <h1 className="max-w-xl font-serif text-4xl leading-[1.1] text-[#1A1A1A] md:text-5xl lg:text-[3.25rem]">
          Manage Your <em className="italic">Glowly</em> Store.
        </h1>
        <p className="max-w-md font-sans text-base leading-relaxed text-[#1A1A1A]/85 md:text-lg">
          Connect your e-commerce platform to unlock product insights and marketing
          workflows.
        </p>
      </section>

      <section className="relative flex flex-1 flex-col bg-[#FAF9F6]">
        <div className="relative flex min-h-[min(100vh,560px)] flex-1 flex-col items-center justify-center px-8 py-16 md:px-14">
          <img
            src={"/hero.jpg"}
            alt={HERO_IMAGE_ALT}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.35]"
          />
          <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 text-center">
            {!workspaceReady ? (
              <p className="font-sans text-sm text-[#1A1A1A]/70">
                Add{" "}
                <code className="rounded border border-[#1A1A1A]/20 bg-[#1A1A1A]/5 px-1.5 py-0.5 text-xs">
                  NEXT_PUBLIC_UNIFIED_WORKSPACE_ID
                </code>{" "}
                to your environment to enable connection.
              </p>
            ) : isConnected ? (
              <div className="flex w-full flex-col gap-4">
                <p className="font-sans text-sm text-[#1A1A1A]/80">Your store is already connected.</p>
                <p className="rounded border border-[#1A1A1A]/20 bg-[#1A1A1A]/5 px-4 py-3 text-sm text-[#1A1A1A]/85">
                  Use the refresh button in the Inventory section to reload products.
                </p>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-4">
                <p className="font-sans text-sm text-[#1A1A1A]/80">Choose your platform:</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="platform"
                      value="shopify"
                      checked={selectedPlatform === "shopify"}
                      onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                      disabled={isConnected}
                      className="w-4 h-4 text-[#1A1A1A] border-[#1A1A1A]/30 focus:ring-[#1A1A1A]/50"
                    />
                    <span className="font-sans text-sm text-[#1A1A1A]">Shopify</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="platform"
                      value="woocommerce"
                      checked={selectedPlatform === "woocommerce"}
                      onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                      disabled={isConnected}
                      className="w-4 h-4 text-[#1A1A1A] border-[#1A1A1A]/30 focus:ring-[#1A1A1A]/50"
                    />
                    <span className="font-sans text-sm text-[#1A1A1A]">WooCommerce</span>
                  </label>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onConnect(selectedPlatform)}
              disabled={!workspaceReady || isConnected}
              className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A] bg-[#FAF9F6]/95 px-10 py-3.5 font-sans text-base font-medium text-[#1A1A1A] transition-colors enabled:hover:bg-[#1A1A1A] enabled:hover:text-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnected ? "Connected" : "Connect Store ↗"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
