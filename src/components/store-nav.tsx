type Props = {
  connectionId?: string;
};

function shortId(id: string, max = 10) {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export function StoreNav({ connectionId }: Props) {
  const connected = Boolean(connectionId);

  return (
    <header className="flex items-center justify-between border-b border-[#1A1A1A]/10 bg-[#FAF9F6] px-6 py-4 md:px-10">
      <div className="font-serif text-xl tracking-tight text-[#1A1A1A] md:text-2xl">
        Store
      </div>
      {connected && connectionId ? (
        <div className="rounded-full border border-[#1A1A1A]/20 bg-[#FAF9F6] px-3 py-1.5 font-sans text-xs text-[#1A1A1A]/75">
          Store Connected{" "}
          <span className="font-medium text-[#1A1A1A]">
            (ID: {shortId(connectionId)})
          </span>
        </div>
      ) : (
        <div className="font-sans text-xs text-[#1A1A1A]/40" aria-hidden="true">
          &nbsp;
        </div>
      )}
    </header>
  );
}
