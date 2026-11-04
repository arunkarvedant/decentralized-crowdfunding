"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Campaign } from "@/types/crowdfunding";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Coins,
  Calendar,
  Layers,
  Shield,
  Eye,
} from "lucide-react";

interface CreateCampaignWizardProps {
  onSuccess: (newAddress: string) => void;
}

const CATEGORIES: Campaign["category"][] = [
  "Technology",
  "Open Source",
  "Art & Film",
  "Community",
  "Gaming",
  "Other",
];

const DEFAULT_COVER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
];

export const CreateCampaignWizard: React.FC<CreateCampaignWizardProps> = ({ onSuccess }) => {
  const { createCampaign, isPaused, platformFeeBps } = useWeb3();

  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [category, setCategory] = useState<Campaign["category"]>("Technology");
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVER_IMAGES[0]);
  const [description, setDescription] = useState<string>("");
  const [goal, setGoal] = useState<string>("5.0");
  const [durationDays, setDurationDays] = useState<number>(30);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateStep1 = () => {
    if (!title.trim()) return "Title is required (FR-4).";
    if (title.length > 80) return "Title cannot exceed 80 characters.";
    if (!summary.trim()) return "Summary is required.";
    if (summary.length > 200) return "Summary cannot exceed 200 characters.";
    if (!description.trim()) return "Full description is required.";
    return null;
  };

  const validateStep2 = () => {
    const g = parseFloat(goal);
    if (isNaN(g) || g <= 0) return "Goal must be greater than 0 ETH.";
    if (durationDays < 1 || durationDays > 90) return "Duration must be between 1 and 90 days (FR-4).";
    return null;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      const newAddress = await createCampaign({
        title,
        summary,
        description,
        category,
        coverImage,
        goal,
        durationDays,
      });
      onSuccess(newAddress);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to deploy campaign clone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPaused) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Campaign Creation Paused</h2>
        <p className="text-sm text-slate-400">
          The factory contract is temporarily paused by platform administration. Existing campaigns,
          contributions, withdrawals, and refunds continue to function without interruption.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Wizard Header & Steps Progress */}
      <div className="space-y-4 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch in Under 5 Minutes (FR-4)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Launch an ETH Crowdfunding Campaign</h1>
        <p className="text-xs text-slate-400">
          Deploys an independent minimal proxy smart contract holding all funds autonomously.
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-3 pt-2">
          {[
            { num: 1, label: "Basics" },
            { num: 2, label: "Goal & Duration" },
            { num: 3, label: "Review & Deploy" },
          ].map((s) => (
            <div key={s.num} className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s.num
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : step > s.num
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-xs ${step === s.num ? "text-white font-semibold" : "text-slate-500"}`}>
                {s.label}
              </span>
              {s.num < 3 && <div className="w-8 h-px bg-slate-800" />}
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Step 1: Campaign Metadata
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="font-semibold text-slate-300">Campaign Title</label>
                <span className="text-slate-500">{title.length}/80 chars</span>
              </div>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g. ZeroGas: Account Abstraction SDK"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Campaign["category"])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="font-semibold text-slate-300">Short Summary</label>
                  <span className="text-slate-500">{summary.length}/200 chars</span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="One sentence describing what you are building..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center space-x-2 pt-2">
                <span className="text-[11px] text-slate-500">Preset previews:</span>
                {DEFAULT_COVER_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCoverImage(img)}
                    className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img src={img} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Project Description (Markdown supported)
              </label>
              <textarea
                rows={6}
                placeholder="Explain the technical problem, roadmap, team background, and how the ETH will be used..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
            >
              <span>Next: Goal & Duration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Funding Goal & Duration */}
      {step === 2 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Step 2: Funding Target & Deadline (Immutable Once Launched)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Funding Goal (in ETH)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full pl-3 pr-12 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ETH
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                All-or-nothing: You only receive these funds if 100% or more is raised before the deadline.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Campaign Duration (in Days, 1 to 90 days)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full pl-3 pr-14 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  DAYS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Duration is converted to an immutable block timestamp deadline on-chain.
              </p>
            </div>
          </div>

          {/* Fee Policy Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>Transparent Platform Fee: {platformFeeBps / 100}%</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The 2% fee is deducted only on successful campaigns upon withdrawal. Failed campaigns have zero
              fees and 100% full refund guarantees for backers.
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
            >
              <span>Next: Review & Confirm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 3 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Step 3: Preview & Confirm Deployment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Live Card Preview */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md">
              <div className="h-44 w-full bg-slate-900 relative">
                <img src={coverImage} alt="preview" className="w-full h-full object-cover" />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/90 text-slate-200">
                  {category}
                </span>
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ● Active
                </span>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-bold text-white text-sm line-clamp-1">{title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{summary}</p>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-xs">
                  <div>
                    <span className="font-bold font-mono text-white">0.0 ETH</span>
                    <span className="text-slate-500 ml-1">of {goal} ETH</span>
                  </div>
                  <span className="text-slate-400">{durationDays} days left</span>
                </div>
              </div>
            </div>

            {/* Invariants & Deployment Info */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Contract Specifications
                </span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Architecture:</span>
                    <span className="font-mono text-emerald-400">EIP-1167 Minimal Proxy Clone</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Goal:</span>
                    <span className="font-mono text-white font-bold">{goal} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-mono text-white">{durationDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee:</span>
                    <span className="font-mono text-white">{platformFeeBps / 100}% on success</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refund Guarantee:</span>
                    <span className="text-emerald-400 font-semibold">100% full refund on failure</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                By deploying, your campaign metadata will be committed to IPFS and a clone contract will be
                deployed on-chain via the CampaignFactory.
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Deploying Clone Contract...</span>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Confirm & Deploy On-Chain (FR-7)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
