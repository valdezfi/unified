"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/product-card";
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
};

export function ProductSection({ connectionId }: Props) {
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);

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

  const handlePromote = useCallback(async (product: DisplayProduct) => {
    setPromotingId(product.id);
    setPromoteMsg(null);
    try {
      const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: product.id,
            title: product.title,
            imageUrl: product.imageUrl,
            productUrl: product.productUrl,
            slug: product.slug,
            description: product.description,
          },
        }),
      });
      const json = (await res.json()) as { error?: string; adId?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to promote product");
      }
      setPromoteMsg(`Ad created in paused state${json.adId ? ` (id: ${json.adId})` : ""}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to promote product";
      setPromoteMsg(msg);
    } finally {
      setPromotingId(null);
    }
  }, []);

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
                  promoting={promotingId === p.id}
                  onPromote={handlePromote}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
