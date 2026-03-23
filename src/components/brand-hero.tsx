import { HERO_IMAGE_ALT, HERO_IMAGE_SRC } from "@/config/brand";

type Props = {
  onConnect: () => void;
  workspaceReady: boolean;
};

export function BrandHero({ onConnect, workspaceReady }: Props) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <section className="flex flex-1 flex-col justify-center gap-6 bg-[#E4F9A0] px-8 py-16 md:px-14 md:py-20">
        <h1 className="max-w-xl font-serif text-4xl leading-[1.1] text-[#1A1A1A] md:text-5xl lg:text-[3.25rem]">
          Manage Your <em className="italic">Glowly</em> Store.
        </h1>
        <p className="max-w-md font-sans text-base leading-relaxed text-[#1A1A1A]/85 md:text-lg">
          Connect your Shopify data to unlock product insights and marketing
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
            ) : null}
            <button
              type="button"
              onClick={onConnect}
              disabled={!workspaceReady}
              className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A] bg-[#FAF9F6]/95 px-10 py-3.5 font-sans text-base font-medium text-[#1A1A1A] transition-colors enabled:hover:bg-[#1A1A1A] enabled:hover:text-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect Shopify Store ↗
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
