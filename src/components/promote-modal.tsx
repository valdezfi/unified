"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Facebook, Video, X, Youtube } from "lucide-react";
import type { DisplayProduct } from "@/lib/parse-products";

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

type Props = {
  product: DisplayProduct;
  defaultMetaSelected: boolean;
  defaultYouTubeSelected: boolean;
  defaultTikTokSelected?: boolean;
  tikTokLinked: boolean;
  onClose: () => void;
  onSubmit: (input: {
    meta: boolean;
    youtube: boolean;
    tikTok: boolean;
    youtubePayload?: YouTubePayload;
    tiktokPayload?: TikTokPayload;
  }) => Promise<void>;
  submitting?: boolean;
};

const interestOptions = ["Fashion", "Shopping", "Sports", "Tech"] as const;

function clampText(value: string, max: number) {
  const v = value.trimStart();
  if (v.length <= max) return v;
  return v.slice(0, max);
}

export function PromoteModal({
  product,
  defaultMetaSelected,
  defaultYouTubeSelected,
  defaultTikTokSelected = false,
  tikTokLinked,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const existingYouTubeUrl = product.youtubeUrl;

  const [metaEnabled, setMetaEnabled] = useState(defaultMetaSelected);
  const [youtubeEnabled, setYouTubeEnabled] = useState(defaultYouTubeSelected);
  const [tikTokEnabled, setTikTokEnabled] = useState(defaultTikTokSelected);

  const [videoMode, setVideoMode] = useState<"existing" | "paste">(
    existingYouTubeUrl ? "existing" : "paste",
  );
  const [pastedVideoUrl, setPastedVideoUrl] = useState(existingYouTubeUrl ?? "");

  const [headline, setHeadline] = useState("");
  const [longHeadline, setLongHeadline] = useState("");
  const [dailyBudget, setDailyBudget] = useState<number>(10);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [country, setCountry] = useState<string>("US");
  const [interests, setInterests] = useState<string[]>([]);
  const [tikTokAdText, setTikTokAdText] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMetaEnabled(defaultMetaSelected);
    setYouTubeEnabled(defaultYouTubeSelected);
    setTikTokEnabled(defaultTikTokSelected);
    setVideoMode(existingYouTubeUrl ? "existing" : "paste");
    setPastedVideoUrl(existingYouTubeUrl ?? "");
    setHeadline("");
    setLongHeadline("");
    setDailyBudget(10);
    setDurationDays(7);
    setCountry("US");
    setInterests([]);
    setTikTokAdText("");
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const finalVideoUrl = useMemo(() => {
    if (!youtubeEnabled) return "";
    if (videoMode === "existing") return existingYouTubeUrl ?? "";
    return pastedVideoUrl;
  }, [existingYouTubeUrl, pastedVideoUrl, videoMode, youtubeEnabled]);

  const validate = () => {
    setFormError(null);

    if (!metaEnabled && !youtubeEnabled && !tikTokEnabled) {
      setFormError("Select at least one channel: Meta, YouTube, or TikTok.");
      return false;
    }

    if (tikTokEnabled) {
      if (!product.productVideoUrl?.trim()) {
        setFormError(
          "This product needs a hosted video URL (e.g. Shopify .mp4) for TikTok. YouTube links cannot be used as the direct upload source.",
        );
        return false;
      }
      if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
        setFormError("Daily budget must be greater than 0.");
        return false;
      }
      if (!Number.isFinite(durationDays) || durationDays <= 0) {
        setFormError("Duration (days) must be greater than 0.");
        return false;
      }
      const c = country.trim();
      if (!c) {
        setFormError("Country / region is required for TikTok targeting.");
        return false;
      }
    }

    if (youtubeEnabled) {
      if (!finalVideoUrl?.trim()) {
        setFormError("YouTube video URL is required.");
        return false;
      }
      const h = headline.trim();
      const lh = longHeadline.trim();
      if (!h) {
        setFormError("Headline is required for the YouTube ad.");
        return false;
      }
      if (!lh) {
        setFormError("Long Headline is required for the YouTube ad.");
        return false;
      }
      if (h.length > 30) {
        setFormError("Headline must be 30 characters or less.");
        return false;
      }
      if (lh.length > 90) {
        setFormError("Long Headline must be 90 characters or less.");
        return false;
      }
      if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
        setFormError("Daily budget must be greater than 0.");
        return false;
      }
      if (!Number.isFinite(durationDays) || durationDays <= 0) {
        setFormError("Duration (days) must be greater than 0.");
        return false;
      }
      const c = country.trim();
      if (!c) {
        setFormError("Country / region is required.");
        return false;
      }
    }

    return true;
  };

  const onLaunch = async () => {
    if (tikTokEnabled && !tikTokLinked) {
      window.location.href = "/api/auth/tiktok";
      return;
    }
    if (!validate()) return;

    await onSubmit({
      meta: metaEnabled,
      youtube: youtubeEnabled,
      tikTok: tikTokEnabled,
      youtubePayload: youtubeEnabled
        ? {
            videoUrl: finalVideoUrl.trim(),
            headline: clampText(headline, 30),
            longHeadline: clampText(longHeadline, 90),
            dailyBudget,
            durationDays,
            country: country.trim() || "US",
            interests,
          }
        : undefined,
      tiktokPayload: tikTokEnabled
        ? {
            dailyBudget,
            durationDays,
            country: country.trim() || "US",
            adText: tikTokAdText.trim()
              ? clampText(tikTokAdText, 100)
              : undefined,
          }
        : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting) onClose();
        }}
        role="button"
        aria-label="Close"
        tabIndex={0}
      />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <h3 className="font-serif text-lg">Launch Promotion</h3>
          <button
            type="button"
            onClick={() => onClose()}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full p-2 text-[#1A1A1A] hover:bg-black/5 disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          <section>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMetaEnabled((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  metaEnabled
                    ? "border-[#1A1A1A] bg-[#7C7EDA] text-white"
                    : "border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-black/5"
                }`}
                disabled={submitting}
              >
                <Facebook size={16} />
                Meta
              </button>
              <button
                type="button"
                onClick={() => setYouTubeEnabled((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  youtubeEnabled
                    ? "border-[#1A1A1A] bg-red-500 text-white"
                    : "border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-black/5"
                }`}
                disabled={submitting}
              >
                <Youtube size={16} />
                YouTube
              </button>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  if (tikTokEnabled) {
                    setTikTokEnabled(false);
                    return;
                  }
                  if (!tikTokLinked) {
                    window.location.href = "/api/auth/tiktok";
                    return;
                  }
                  setTikTokEnabled(true);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  tikTokEnabled
                    ? "border-[#1A1A1A] bg-[#EE1D52] text-white"
                    : "border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-black/5"
                }`}
                disabled={submitting}
                title={
                  !tikTokEnabled && !tikTokLinked
                    ? "Sign in to TikTok Ads to use this channel"
                    : undefined
                }
              >
                <Clapperboard size={16} />
                TikTok
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-[#FAF9F6]">
              <div className="flex gap-4 p-4">
                <img
                  src={product.imageUrl ?? "/product2.jpg"}
                  alt={product.title}
                  className="h-20 w-20 flex-none rounded-lg object-cover"
                />
                <div>
                  <div className="font-serif text-base">{product.title}</div>
                  <div className="text-sm text-[#1A1A1A]/70">
                    {product.productUrl ?? ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm text-[#1A1A1A]/70">
              {youtubeEnabled ? (
                existingYouTubeUrl ? (
                  <div>
                    Found YouTube link from Shopify. You can use it or paste a new one.
                  </div>
                ) : (
                  <div>No YouTube link found. You must paste a YouTube URL.</div>
                )
              ) : null}
              {tikTokEnabled ? (
                <div className="flex items-start gap-2">
                  <Video className="mt-0.5 shrink-0" size={16} />
                  <div>
                    {product.productVideoUrl ? (
                      <span>
                        Product video URL detected for TikTok upload-by-URL.
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        No direct product video (.mp4 / hosted) found on this SKU.
                        Add a video to the product in Shopify, or extend the parser.
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
              {!youtubeEnabled && !tikTokEnabled ? <div /> : null}
            </div>
          </section>

          <section>
            {youtubeEnabled || tikTokEnabled ? (
              <>
                <div className="mt-1">
                  <h4 className="font-serif text-base">
                    {youtubeEnabled && tikTokEnabled
                      ? "Campaign details"
                      : youtubeEnabled
                        ? "YouTube Campaign Setup"
                        : "TikTok Campaign Setup"}
                  </h4>
                </div>

                {youtubeEnabled ? (
                  <>
                    <div className="mt-3">
                      <div className="text-sm font-medium">Video Source</div>
                      <div className="mt-2 flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="videoMode"
                            checked={videoMode === "existing"}
                            onChange={() => setVideoMode("existing")}
                            disabled={!existingYouTubeUrl || submitting}
                          />
                          Use existing YouTube link
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="videoMode"
                            checked={videoMode === "paste"}
                            onChange={() => setVideoMode("paste")}
                            disabled={submitting}
                          />
                          Paste YouTube URL
                        </label>
                      </div>

                      <input
                        type="url"
                        value={
                          videoMode === "paste" ? pastedVideoUrl : finalVideoUrl
                        }
                        onChange={(e) => setPastedVideoUrl(e.target.value)}
                        disabled={submitting || videoMode !== "paste"}
                        placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                        className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                      />
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium">Ad Copy</div>
                      <div className="mt-2 flex flex-col gap-3">
                        <input
                          type="text"
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          placeholder="Headline (max 30 chars)"
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                          disabled={submitting}
                        />
                        <input
                          type="text"
                          value={longHeadline}
                          onChange={(e) => setLongHeadline(e.target.value)}
                          placeholder="Long Headline (max 90 chars)"
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {tikTokEnabled ? (
                  <div className="mt-4">
                    <div className="text-sm font-medium">TikTok ad text</div>
                    <input
                      type="text"
                      value={tikTokAdText}
                      onChange={(e) => setTikTokAdText(e.target.value)}
                      placeholder={`Defaults to product title (max 100 chars)`}
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                      disabled={submitting}
                    />
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Daily Budget</div>
                    <input
                      type="number"
                      value={dailyBudget}
                      min={0}
                      step={1}
                      onChange={(e) => setDailyBudget(Number(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Duration (Days)</div>
                    <input
                      type="number"
                      value={durationDays}
                      min={0}
                      step={1}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium">Targeting</div>
                  <div className="mt-2">
                    <div className="text-xs uppercase tracking-wide text-[#1A1A1A]/60">
                      Country (ISO region, e.g. US)
                    </div>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="US"
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#7C7EDA]"
                      disabled={submitting}
                    />
                  </div>

                  {youtubeEnabled ? (
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-wide text-[#1A1A1A]/60">
                        Interests
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {interestOptions.map((opt) => {
                          const checked = interests.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setInterests((prev) =>
                                  prev.includes(opt)
                                    ? prev.filter((x) => x !== opt)
                                    : [...prev, opt],
                                );
                              }}
                              disabled={submitting}
                              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                checked
                                  ? "border-[#1A1A1A] bg-[#7C7EDA] text-white"
                                  : "border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-black/5"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : metaEnabled ? (
              <div className="mt-2 text-sm text-[#1A1A1A]/70">
                Meta uses your ad account credentials from the server environment.
              </div>
            ) : (
              <div className="mt-2 text-sm text-[#1A1A1A]/70">
                Enable YouTube or TikTok above to configure video ads, or choose
                Meta.
              </div>
            )}

            {formError ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-black/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onLaunch()}
                disabled={submitting}
                className="flex-1 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                Launch Campaign
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

