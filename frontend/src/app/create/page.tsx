"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWeb3 } from "@/context/Web3Context";
import { CampaignCategory } from "@/types/crowdfunding";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Coins,
  Shield,
  Upload,
  Clock,
} from "lucide-react";
import { FancyButton, Meter, Badge } from "@/components/ui/cubby-ui";

const CATEGORIES: CampaignCategory[] = [
  "Technology",
  "Open Source",
  "Art & Film",
  "Community",
  "Gaming",
  "Other",
];

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
];

const campaignFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(80, "Title cannot exceed 80 characters"),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(200, "Summary cannot exceed 200 characters"),
  description: z
    .string()
    .min(30, "Please provide a detailed markdown description (min 30 characters)"),
  category: z.enum([
    "Technology",
    "Open Source",
    "Art & Film",
    "Community",
    "Gaming",
    "Other",
  ]),
  goalEth: z
    .string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Goal must be a valid positive ETH amount (e.g. 5.0)"),
  durationDays: z
    .number()
    .min(1, "Duration must be at least 1 day")
    .max(90, "Duration cannot exceed 90 days"),
  coverImage: z.string().min(1, "Cover image URL or upload is required"),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const { wallet, createCampaign, isPaused, factoryFeeBps, connectWallet } = useWeb3();

  const [step, setStep] = useState<number>(1);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      title: "",
      summary: "",
      description: "",
      category: "Technology",
      goalEth: "5.0",
      durationDays: 30,
      coverImage: PRESET_IMAGES[0],
    },
    mode: "onChange",
  });

  const formValues = watch();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pin", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to pin file to IPFS.");
      }

      const data = await res.json();
      setValue("coverImage", data.url || data.cid, { shouldValidate: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setUploadError(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["title", "summary", "category", "coverImage"]);
    } else if (step === 2) {
      isValid = await trigger(["description", "goalEth", "durationDays"]);
    }

    if (isValid) {
      setSubmissionError(null);
      setStep((prev) => prev + 1);
    }
  };

  const onSubmit = async (data: CampaignFormValues) => {
    if (!wallet.isConnected) {
      await connectWallet();
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const newAddress = await createCampaign(data.goalEth, data.durationDays, {
        title: data.title,
        summary: data.summary,
        description: data.description,
        category: data.category,
        coverImage: data.coverImage,
      });

      if (newAddress) {
        router.push(`/campaign/${newAddress}`);
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Campaign creation failed";
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="sm">
            EIP-1167 Minimal Proxy Factory
          </Badge>
          {isPaused && (
            <Badge variant="warning" size="sm" dot>
              Factory Paused
            </Badge>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Launch Escrow Campaign
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Deploy an autonomous, all-or-nothing crowdfunding smart contract clone in ~348k gas.
          If your campaign fails to reach its target by the deadline, backers reclaim 100% full refunds.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="flex items-center justify-between p-1 rounded-2xl bg-[#0c1017] border border-white/[0.08]">
        {[
          { num: 1, label: "Basics & Media" },
          { num: 2, label: "Story & Goal" },
          { num: 3, label: "Review & Deploy" },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => {
              if (s.num < step) setStep(s.num);
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              step === s.num
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md"
                : step > s.num
                ? "text-slate-300 hover:text-white cursor-pointer"
                : "text-slate-500 cursor-not-allowed"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                step === s.num
                  ? "bg-emerald-400 text-slate-950 font-bold"
                  : step > s.num
                  ? "bg-white/[0.1] text-emerald-400"
                  : "bg-white/[0.05] text-slate-500"
              }`}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {submissionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Wizard Step 1: Basics & Media */}
      {step === 1 && (
        <div className="space-y-6 bg-[#0d121c] p-6 sm:p-8 rounded-2xl border border-white/[0.08]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 1: Campaign Basics & Category</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Campaign Title * <span className="text-slate-500">({formValues.title.length}/80)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ZeroGas: Account Abstraction Toolkit"
                {...register("title")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              {errors.title && (
                <p className="text-xs text-rose-400 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Short Summary * <span className="text-slate-500">({formValues.summary.length}/200)</span>
              </label>
              <textarea
                rows={2}
                placeholder="A punchy 1-2 sentence hook explaining what you are building and why."
                {...register("summary")}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              {errors.summary && (
                <p className="text-xs text-rose-400 mt-1">{errors.summary.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  {...register("category")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1017] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Upload Cover Image to IPFS (max 5MB)
                </label>
                <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs text-slate-300 hover:text-white cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{uploadingImage ? "Uploading to IPFS..." : "Choose Image File"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                {uploadError && (
                  <p className="text-xs text-rose-400 mt-1">{uploadError}</p>
                )}
              </div>
            </div>

            {/* Presets or Upload Preview */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-slate-300">
                Or select a preset cover image:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_IMAGES.map((imgUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setValue("coverImage", imgUrl, { shouldValidate: true })}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                      formValues.coverImage === imgUrl
                        ? "border-emerald-400 ring-2 ring-emerald-400/20"
                        : "border-white/[0.08] hover:border-white/[0.2]"
                    }`}
                  >
                    <img src={imgUrl} alt="Preset cover" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/[0.08]">
            <FancyButton variant="glow" size="md" onClick={handleNextStep} className="gap-2">
              <span>Next: Story & Goal</span>
              <ArrowRight className="w-4 h-4" />
            </FancyButton>
          </div>
        </div>
      )}

      {/* Wizard Step 2: Story & Goal */}
      {step === 2 && (
        <div className="space-y-6 bg-[#0d121c] p-6 sm:p-8 rounded-2xl border border-white/[0.08]">
          <h2 className="text-lg font-bold text-white">Step 2: Funding Goal & Full Story</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Funding Target (ETH) *
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. 5.0"
                    {...register("goalEth")}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
                {errors.goalEth && (
                  <p className="text-xs text-rose-400 mt-1">{errors.goalEth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Duration (Days, 1–90) *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    max={90}
                    {...register("durationDays", { valueAsNumber: true })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
                {errors.durationDays && (
                  <p className="text-xs text-rose-400 mt-1">{errors.durationDays.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Description (Markdown supported) *
              </label>
              <textarea
                rows={8}
                placeholder="### Overview&#10;Describe your vision, roadmap, budget allocation, and the impact of this campaign."
                {...register("description")}
                className="w-full p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              {errors.description && (
                <p className="text-xs text-rose-400 mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-white/[0.08]">
            <FancyButton
              variant="default"
              size="md"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </FancyButton>
            <FancyButton variant="glow" size="md" onClick={handleNextStep} className="gap-2">
              <span>Next: Review & Deploy</span>
              <ArrowRight className="w-4 h-4" />
            </FancyButton>
          </div>
        </div>
      )}

      {/* Wizard Step 3: Review & On-Chain Deployment */}
      {step === 3 && (
        <div className="space-y-6 bg-[#0d121c] p-6 sm:p-8 rounded-2xl border border-white/[0.08]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 3: Review & Broadcast Deployment</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Card Preview */}
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Live Card Preview
              </span>
              <div className="rounded-2xl overflow-hidden bg-[#0a0d13] border border-white/[0.1] shadow-xl">
                <div className="aspect-video relative overflow-hidden bg-slate-950">
                  <img
                    src={formValues.coverImage}
                    alt={formValues.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="default" size="sm">
                      {formValues.category}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="success" size="sm" dot>
                      READY
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-white text-base truncate">{formValues.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{formValues.summary}</p>
                  <Meter value={0} label={`0.00 ETH / ${formValues.goalEth} ETH`} size="sm" />
                </div>
              </div>
            </div>

            {/* Smart Contract Terms Summary */}
            <div className="space-y-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Smart Contract Parameters
              </span>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Goal:</span>
                  <span className="font-mono text-white font-bold">{formValues.goalEth} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-mono text-white">{formValues.durationDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Escrow Architecture:</span>
                  <span className="font-mono text-cyan-400">EIP-1167 Clone</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform Fee (on success):</span>
                  <span className="font-mono text-amber-400">{(factoryFeeBps / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Refund on Failure:</span>
                  <span className="font-mono text-emerald-400">100% Guaranteed</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  The smart contract enforces that you receive funds strictly if the full {formValues.goalEth} ETH
                  target is reached. Metadata is pinned to IPFS and the CID hash is stored permanently on-chain.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-white/[0.08]">
            <FancyButton
              variant="default"
              size="md"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </FancyButton>

            <FancyButton
              variant="glow"
              size="lg"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || isPaused}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                {isSubmitting
                  ? "Deploying Clone Contract..."
                  : isPaused
                  ? "Factory Paused"
                  : "Deploy Campaign Escrow"}
              </span>
            </FancyButton>
          </div>
        </div>
      )}
    </div>
  );
}
