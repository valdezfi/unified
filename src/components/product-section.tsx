"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/product-card";
import { PromoteModal } from "@/components/promote-modal";
import {
  parseCommerceItemsPayload,
  type DisplayProduct,
} from "@/lib/parse-products";

const sectionEase = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: sectionEase },
  },
};

type Props = {
  connectionId: string;
  tikTokLinked: boolean;
};

export function ProductSection({ connectionId, tikTokLinked }: Props) {
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DisplayProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);

  type YouTubePayload = {
    videoUrl: string;
    headline: string;
    longHeadline: string;
    dailyBudget: number;
    durationDays: number;
    country: string;
    interests: string[];
  };

  type TikTokPayload = {
    dailyBudget: number;
    durationDays: number;
    country: string;
    adText?: string;
  };

  type SubmitInput = {
    meta: boolean;
    youtube: boolean;
    tikTok: boolean;
    youtubePayload?: YouTubePayload;
    tiktokPayload?: TikTokPayload;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/unified?connectionId=${encodeURIComponent(connectionId)}&category=commerce&endpoint=item`,
      );
      const json = await res.json();
      if (!res.ok) {
        const msg =
          typeof json?.error === "string" ? json.error : "Failed to load products";
        setError(msg);
        setProducts([]);
        return;
      }
      setProducts(parseCommerceItemsPayload(json));
    } catch {
      setError("Network error");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleModalSubmit = useCallback(async (input: SubmitInput) => {
      if (!selectedProduct) return;
      setSubmitting(true);
      setPromoteMsg(null);

    const messages: string[] = [];
    const errors: string[] = [];

    const runMeta = async () => {
      const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: selectedProduct.id,
            title: selectedProduct.title,
            imageUrl: selectedProduct.imageUrl,
            productUrl: selectedProduct.productUrl,
            slug: selectedProduct.slug,
            description: selectedProduct.description,
          },
        }),
      });
      const json = (await res.json()) as { error?: string; adId?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to promote to Meta");
      }
      messages.push(
        `Meta campaign created in paused state${json.adId ? ` (id: ${json.adId})` : ""}.`,
      );
    };

    const runYouTube = async () => {
      const res = await fetch("/api/promote/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: selectedProduct.id,
            title: selectedProduct.title,
            imageUrl: selectedProduct.imageUrl,
            productUrl: selectedProduct.productUrl,
            slug: selectedProduct.slug,
            description: selectedProduct.description,
          },
          youtubePayload: input.youtubePayload,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        youtubeVideoId?: string;
        status?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to promote to YouTube");
      }
      messages.push(
        `YouTube campaign queued${json.youtubeVideoId ? ` (video: ${json.youtubeVideoId})` : ""}.`,
      );
    };

    const runTikTok = async () => {
      const res = await fetch("/api/promote/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: selectedProduct.id,
            title: selectedProduct.title,
            productUrl: selectedProduct.productUrl,
            slug: selectedProduct.slug,
            description: selectedProduct.description,
            productVideoUrl: selectedProduct.productVideoUrl,
          },
          tiktokPayload: input.tiktokPayload,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        campaignId?: string;
        adgroupId?: string;
        adIds?: string[];
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to promote to TikTok");
      }
      messages.push(
        `TikTok structures created (paused)${json.adgroupId ? ` — ad group ${json.adgroupId}` : ""}.`,
      );
    };

    try {
      if (input.meta) {
        try {
          await runMeta();
        } catch (err) {
          errors.push(`Meta: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (input.youtube) {
        try {
          await runYouTube();
        } catch (err) {
          errors.push(
            `YouTube: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
      }

      if (input.tikTok) {
        try {
          await runTikTok();
        } catch (err) {
          errors.push(
            `TikTok: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
      }

      setPromoteMsg([...messages, ...errors].join(" "));

      // Close the modal only if all selected channels succeeded.
      const anySelected = input.meta || input.youtube || input.tikTok;
      const allSucceeded =
        anySelected && errors.length === 0 && messages.length > 0;
      if (allSucceeded) {
        setModalOpen(false);
        setSelectedProduct(null);
      }
    } finally {
      setSubmitting(false);
    }
    }, [selectedProduct]);

  return (
    <motion.div
      className="bg-[#FAF9F6]"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: sectionEase }}
    >
      <motion.section
        className="border-b border-[#1A1A1A]/10 bg-[#7C7EDA] px-6 py-14 md:px-10 md:py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <h2 className="max-w-3xl font-serif text-4xl text-white md:text-5xl">
          Your Store Inventory.
        </h2>
      </motion.section>

      <main className="px-6 py-10 md:px-10 md:py-12">
        {promoteMsg ? (
          <p className="mb-4 font-sans text-sm text-[#1A1A1A]/80">{promoteMsg}</p>
        ) : null}
        {loading ? (
          <p className="font-sans text-sm text-[#1A1A1A]/60">Loading products…</p>
        ) : error ? (
          <p className="font-sans text-sm text-[#1A1A1A]/80">{error}</p>
        ) : products.length === 0 ? (
          <p className="font-sans text-sm text-[#1A1A1A]/60">
            No products returned yet.
          </p>
        ) : (
          <motion.div
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {products.map((p, i) => (
              <motion.div key={p.id} variants={itemVariants}>
                <ProductCard
                  product={p}
                  index={i}
                  promoting={modalOpen || submitting}
                  onPromote={(prod) => {
                    setSelectedProduct(prod);
                    setModalOpen(true);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {modalOpen && selectedProduct ? (
        <PromoteModal
          product={selectedProduct}
          defaultMetaSelected={true}
          defaultYouTubeSelected={Boolean(
            selectedProduct.youtubeUrl || selectedProduct.youtubeVideoId,
          )}
          defaultTikTokSelected={Boolean(
            selectedProduct.productVideoUrl && tikTokLinked,
          )}
          tikTokLinked={tikTokLinked}
          submitting={submitting}
          onClose={() => {
            if (submitting) return;
            setModalOpen(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleModalSubmit}
        />
      ) : null}
    </motion.div>
  );
}

