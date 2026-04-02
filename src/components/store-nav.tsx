type Props = {
  connectionId?: string;
  onLogout?: () => void;
};

function shortId(id: string, max = 10) {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export function StoreNav({ connectionId, onLogout }: Props) {
  const connected = Boolean(connectionId);

  return (
    <header className="flex items-center justify-between border-b border-[#1A1A1A]/10 bg-[#FAF9F6] px-6 py-4 md:px-10">
      <div className="font-serif text-xl tracking-tight text-[#1A1A1A] md:text-2xl">
        Store
      </div>
      {connected && connectionId ? (
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-[#1A1A1A]/20 bg-[#FAF9F6] px-3 py-1.5 font-sans text-xs text-[#1A1A1A]/75">
            Store Connected{" "}
            <span className="font-medium text-[#1A1A1A]">
              (ID: {shortId(connectionId)})
            </span>
          </div>
          <button
            onClick={onLogout}
            className="rounded-full border border-[#1A1A1A]/20 bg-[#FAF9F6] px-3 py-1.5 font-sans text-xs text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A]/5 active:bg-[#1A1A1A]/10"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="font-sans text-xs text-[#1A1A1A]/40" aria-hidden="true">
          &nbsp;
        </div>
      )}
    </header>
  );
}
