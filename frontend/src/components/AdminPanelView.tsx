"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import {
  ShieldCheck,
  AlertTriangle,
  Pause,
  Play,
  Sliders,
  DollarSign,
  Flag,
  CheckCircle2,
  Lock,
  Layers,
  ExternalLink,
} from "lucide-react";
import { FancyButton, MarchingBorder } from "@/components/ui/cubby-ui";

export const AdminPanelView: React.FC = () => {
  const {
    account,
    platformFeeBps,
    isPaused,
    campaigns,
    updateFeeBps,
    togglePause,
    flagCampaign,
    contractAddresses,
  } = useWeb3();

  const [newFee, setNewFee] = useState<number>(platformFeeBps);
  const [selectedCampaignToFlag, setSelectedCampaignToFlag] = useState<string>("");
  const [flagReason, setFlagReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateFee = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await updateFeeBps(Number(newFee));
      setSuccessMsg(`Platform fee successfully updated to ${(Number(newFee) / 100).toFixed(2)}% (FR-30).`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to update fee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await togglePause();
      setSuccessMsg(isPaused ? "Factory unpaused." : "Factory paused! New creations blocked (FR-29).");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to toggle factory pause.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagCampaign = async () => {
    if (!selectedCampaignToFlag || !flagReason.trim()) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await flagCampaign(selectedCampaignToFlag, flagReason);
      setSuccessMsg("Campaign flagged and cancelled. Backers are now eligible to claim refunds (FR-31).");
      setSelectedCampaignToFlag("");
      setFlagReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to flag campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pauseCard = (
    <div className="p-6 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-5 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Factory Emergency Pause</span>
        </h2>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            isPaused
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {isPaused ? "PAUSED" : "OPERATIONAL"}
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        In an emergency, the multisig admin can pause the CampaignFactory. This prevents new campaign
        creation while guaranteeing that existing contributions, withdrawals, and refunds continue to
        operate without interruption (FR-29).
      </p>

      <div className="p-3.5 rounded-xl bg-[#080a0e] border border-white/[0.08] text-[11px] text-slate-400">
        <strong className="text-slate-300">Security Invariant:</strong> Platform admin never holds custody of funds and cannot block
        refund claims.
      </div>

      <FancyButton
        onClick={handleTogglePause}
        disabled={isSubmitting}
        variant={isPaused ? "emerald" : "danger"}
        className="w-full justify-center"
        size="md"
      >
        {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
        <span>{isPaused ? "Unpause Factory Creation" : "Emergency Pause Factory"}</span>
      </FancyButton>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Governance & Admin</h1>
        </div>
        <p className="text-xs text-slate-400">
          Admin controls for platform fees, factory pause, and emergency policy delisting. Non-custodial: admin
          cannot access campaign funds.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Fee Governance & Emergency Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Fee Governance (FR-30) */}
        <div className="p-6 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Platform Fee Settings</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-[#080a0e] text-emerald-400 border border-emerald-500/20">
              Current: {platformFeeBps / 100}%
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The platform fee applies solely to successful campaigns upon creator withdrawal. Capped by smart
            contract at a maximum of 500 bps (5.0%).
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-xs">
              <label className="text-slate-300 font-semibold">Fee Basis Points (bps)</label>
              <span className="font-mono text-emerald-400 font-bold">
                {newFee} bps ({(newFee / 100).toFixed(2)}%)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={newFee}
              onChange={(e) => setNewFee(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-[#080a0e] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (0 bps)</span>
              <span>2% (Default)</span>
              <span>5% (Max Cap)</span>
            </div>
          </div>

          <FancyButton
            onClick={handleUpdateFee}
            disabled={isSubmitting || newFee === platformFeeBps}
            variant="primary"
            className="w-full justify-center"
            size="md"
          >
            {isSubmitting ? "Updating..." : "Save Fee On-Chain (FR-30)"}
          </FancyButton>
        </div>

        {/* Card 2: Factory Emergency Pause (FR-29) */}
        {isPaused ? (
          <MarchingBorder borderRadius={16} strokeColor="#f59e0b" duration={5}>
            {pauseCard}
          </MarchingBorder>
        ) : (
          pauseCard
        )}
      </div>

      {/* Flag / Moderation Card (FR-31) */}
      <div className="p-6 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <Flag className="w-4 h-4 text-rose-400" />
          <h2 className="text-base font-bold text-white">Campaign Flagging & Policy Delisting (FR-31)</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          If a campaign violates Terms of Service or is reported as a scam, the admin can flag it. Flagging
          marks the campaign as Cancelled, which safely unlocks 100% full refunds for all backers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Campaign</label>
            <select
              value={selectedCampaignToFlag}
              onChange={(e) => setSelectedCampaignToFlag(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a0e] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
            >
              <option value="">-- Choose Campaign to Flag --</option>
              {campaigns
                .filter((c) => c.status === "Active")
                .map((c) => (
                  <option key={c.address} value={c.address}>
                    {c.title} ({c.address.slice(0, 10)}...)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Flagging</label>
            <input
              type="text"
              placeholder="e.g. Suspected impersonation or copyright breach"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a0e] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <FancyButton
            onClick={handleFlagCampaign}
            disabled={isSubmitting || !selectedCampaignToFlag || !flagReason}
            variant="danger"
            size="md"
          >
            Flag & Cancel Campaign
          </FancyButton>
        </div>
      </div>

      {/* Contract Infrastructure Explorer */}
      <div className="p-6 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-3 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Deployed On-Chain Architecture</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-[#080a0e] border border-white/[0.08] space-y-1">
            <span className="text-slate-500">Campaign Factory:</span>
            <p className="font-mono text-emerald-400 break-all">{contractAddresses.factory}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#080a0e] border border-white/[0.08] space-y-1">
            <span className="text-slate-500">Master Clone Implementation:</span>
            <p className="font-mono text-slate-300 break-all">{contractAddresses.implementation}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#080a0e] border border-white/[0.08] space-y-1">
            <span className="text-slate-500">Fee Treasury Multisig:</span>
            <p className="font-mono text-slate-300 break-all">{contractAddresses.treasury}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
