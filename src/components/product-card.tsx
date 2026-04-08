import type { DisplayProduct } from "@/lib/parse-products";

type Props = {
  product: DisplayProduct;
  index: number;
  onPromote?: (product: DisplayProduct) => void;
  promoting?: boolean;
};

function badgeFor(product: DisplayProduct, index: number): string | null {
  if (product.inventoryHint !== null && product.inventoryHint !== undefined) {
    if (product.inventoryHint <= 3) return "Low Stock";
  }
  if (index === 0) return "Popular";
  if (index === 2) return "New";
  return null;
}

export function ProductCard({
  product,
  index,
  onPromote,
  promoting = false,
}: Props) {
  const badge = badgeFor(product, index);
  const imageSrc = product.imageUrl?.trim() || "/product2.jpg";

  return (
    <article className="flex min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-[#1A1A1A]/12 bg-[#FAF9F6]">
      <div className="relative flex min-h-[14rem] flex-[7] bg-gray-50">
        <img
          src={imageSrc}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {badge ? (
          <span className="absolute right-3 top-3 z-10 -rotate-2 rounded-full border border-[#1A1A1A] bg-[#FAF9F6] px-2.5 py-1 font-sans text-[11px] font-medium uppercase tracking-wide text-[#1A1A1A]">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-[3] flex-col gap-2 p-5 pt-4">
        <h3 className="font-serif text-lg leading-snug text-[#1A1A1A]">
          {product.title}
        </h3>
        <p className="font-sans text-sm text-[#1A1A1A]/70">{product.priceLabel}</p>
        <button
          type="button"
          disabled={promoting}
          onClick={() => onPromote?.(product)}
          className="mt-auto inline-flex items-center justify-center rounded-full border border-[#1A1A1A] bg-transparent px-4 py-2.5 font-sans text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {promoting ? "Promoting..." : "Promote ↗"}
        </button>
      </div>
    </article>
  );
}
