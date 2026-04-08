type Props = {
  connectionId?: string;
  /** When the shop is connected but TikTok OAuth cookies/env are missing */
  tikTokLinked?: boolean;
};

function shortId(id: string, max = 10) {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export function StoreNav({ connectionId, tikTokLinked = false }: Props) {
  const connected = Boolean(connectionId);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A1A]/10 bg-[#FAF9F6] px-6 py-4 md:px-10">
      <div className="font-serif text-xl tracking-tight text-[#1A1A1A] md:text-2xl">
        Store
      </div>
      {connected && connectionId ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!tikTokLinked ? (
            <a
              href="/api/auth/tiktok"
              className="rounded-full border border-[#1A1A1A] bg-[#1A1A1A] px-3 py-1.5 font-sans text-xs font-medium text-white hover:bg-black/90"
            >
              Link TikTok Ads
            </a>
          ) : (
            <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 font-sans text-xs font-medium text-emerald-900">
              TikTok Ads linked
            </span>
          )}
          <div className="rounded-full border border-[#1A1A1A]/20 bg-[#FAF9F6] px-3 py-1.5 font-sans text-xs text-[#1A1A1A]/75">
            Store Connected{" "}
            <span className="font-medium text-[#1A1A1A]">
              (ID: {shortId(connectionId)})
            </span>
          </div>
        </div>
      ) : (
        <div className="font-sans text-xs text-[#1A1A1A]/40" aria-hidden="true">
          &nbsp;
        </div>
      )}
    </header>
  );
}
