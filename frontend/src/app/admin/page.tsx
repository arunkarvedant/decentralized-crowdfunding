"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useWeb3 } from "@/context/Web3Context";
import {
  ShieldCheck,
  AlertTriangle,
  Pause,
  Play,
  Sliders,
  Flag,
  CheckCircle2,
  Lock,
  Layers,
  Coins,
  ShieldAlert,
} from "lucide-react";
import {
  FancyButton,
  Card,
  CardTitle,
  CardDescription,
  Badge,
  StatCard,
} from "@/components/ui/cubby-ui";

export default function AdminPage() {
  const {
    wallet,
    isOwner,
    factoryOwner,
    factoryTreasury,
    factoryFeeBps,
    isPaused,
    campaigns,
    setFeeBps,
    pauseFactory,
    unpauseFactory,
    flagCampaign,
    connectWallet,
  } = useWeb3();

  const [newFee, setNewFee] = useState<number>(factoryFeeBps || 200);
  const [selectedCampaignToFlag, setSelectedCampaignToFlag] = useState<string>("");
  const [flagReason, setFlagReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 403 Access Denied screen if caller is not the factory owner
  if (!wallet.isConnected || !isOwner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">403 — Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This governance dashboard is restricted exclusively to the platform factory owner.
          </p>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Required Owner:</span>
              <span className="text-emerald-400">
                {factoryOwner ? `${factoryOwner.slice(0, 6)}...${factoryOwner.slice(-4)}` : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Your Address:</span>
              <span className="text-white">
                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Not connected"}
              </span>
            </div>
          </div>
        </div>

        {!wallet.isConnected ? (
          <FancyButton variant="glow" size="md" onClick={connectWallet}>
            Connect Owner Wallet
          </FancyButton>
        ) : (
          <Link href="/">
            <FancyButton variant="default" size="md">
              Return to Explore
            </FancyButton>
          </Link>
        )}
      </div>
    );
  }

  const handleUpdateFee = async () => {
    if (newFee < 0 || newFee > 500) {
      setErrorMsg("Platform fee cannot exceed 500 basis points (5.0%).");
      return;
    }
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await setFeeBps(newFee);
      setSuccessMsg(`Platform fee successfully updated to ${(newFee / 100).toFixed(2)}%!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update fee.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      if (isPaused) {
        await unpauseFactory();
        setSuccessMsg("Factory unpaused! Campaign creations resumed.");
      } else {
        await pauseFactory();
        setSuccessMsg("Factory emergency pause engaged. New campaign creations blocked.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle pause.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagCampaign = async () => {
    if (!selectedCampaignToFlag || !flagReason.trim()) {
      setErrorMsg("Please select a campaign and enter a justification.");
      return;
    }
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await flagCampaign(selectedCampaignToFlag, flagReason);
      setSuccessMsg("Campaign flagged and cancelled. Backers are now eligible to claim full refunds.");
      setSelectedCampaignToFlag("");
      setFlagReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to flag campaign.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              Factory Owner Multisig
            </Badge>
            {isPaused && (
              <Badge variant="warning" size="sm" dot>
                Factory Paused
              </Badge>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Governance & Admin Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure protocol fee parameters, toggle circuit breaker pauses, and moderate campaigns.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Platform Fee"
          value={(factoryFeeBps / 100).toFixed(2)}
          unit="%"
          delta={{ value: "Max 5.0%", trend: "neutral" }}
          icon={<Coins className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Factory Status"
          value={isPaused ? "PAUSED" : "OPERATIONAL"}
          unit=""
          delta={{ value: isPaused ? "Creations Blocked" : "Active", trend: isPaused ? "down" : "up" }}
          icon={isPaused ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Platform Treasury"
          value={factoryTreasury ? `${factoryTreasury.slice(0, 6)}...` : "None"}
          unit=""
          delta={{ value: "Pull fee recipient", trend: "neutral" }}
          icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
        />
        <StatCard
          title="Total Registered Escrows"
          value={campaigns.length}
          unit="Clones"
          delta={{ value: "EIP-1167", trend: "up" }}
          icon={<Layers className="w-4 h-4 text-purple-400" />}
        />
      </div>

      {/* Admin Action Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Fee Adjustment */}
        <Card className="p-6 bg-[#0d121c] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-base text-white">Platform Fee Configuration</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Update platform fee deducted on creator payouts. Capped at 500 bps (5.0%).
            </CardDescription>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Target Fee:</span>
                <span className="text-emerald-400 font-bold">{(newFee / 100).toFixed(2)}% ({newFee} bps)</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="25"
                value={newFee}
                onChange={(e) => setNewFee(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.0% (Free)</span>
                <span>2.0% (Default)</span>
                <span>5.0% (Cap)</span>
              </div>
            </div>
          </div>

          <FancyButton
            variant="glow"
            size="sm"
            onClick={handleUpdateFee}
            disabled={isSubmitting || newFee === factoryFeeBps}
            className="w-full justify-center mt-4"
          >
            <span>Update Fee to {(newFee / 100).toFixed(2)}%</span>
          </FancyButton>
        </Card>

        {/* Card 2: Emergency Circuit Breaker */}
        <Card className="p-6 bg-[#0d121c] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-base text-white">Emergency Circuit Breaker</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400 leading-relaxed">
              Pausing blocks new campaign creation. Existing campaigns continue to process refunds
              and withdrawals autonomously.
            </CardDescription>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Current State:</span>
                <span className={isPaused ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isPaused ? "PAUSED" : "OPERATIONAL"}
                </span>
              </div>
            </div>
          </div>

          <FancyButton
            variant={isPaused ? "glow" : "destructive"}
            size="sm"
            onClick={handleTogglePause}
            disabled={isSubmitting}
            className="w-full justify-center gap-2 mt-4"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{isPaused ? "Unpause Factory" : "Engage Emergency Pause"}</span>
          </FancyButton>
        </Card>

        {/* Card 3: Campaign Moderation */}
        <Card className="p-6 bg-[#0d121c] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Flag className="w-5 h-5 text-rose-400" />
              <CardTitle className="text-base text-white">Moderate Campaign (Flag)</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Flag and cancel an abusive ACTIVE campaign. Immediately unlocks 100% full refund claims for backers.
            </CardDescription>

            <div className="space-y-2">
              <select
                value={selectedCampaignToFlag}
                onChange={(e) => setSelectedCampaignToFlag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0c1017] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-rose-500/50"
              >
                <option value="">Select active campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.address} value={c.address}>
                    {c.title} ({c.address.slice(0, 6)}...{c.address.slice(-4)})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Reason (e.g. Terms violation)"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          <FancyButton
            variant="destructive"
            size="sm"
            onClick={handleFlagCampaign}
            disabled={isSubmitting || !selectedCampaignToFlag || !flagReason.trim()}
            className="w-full justify-center gap-1.5 mt-4"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Flag & Cancel Campaign</span>
          </FancyButton>
        </Card>
      </div>
    </div>
  );
}
