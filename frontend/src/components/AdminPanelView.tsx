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
  Activity,
  Vault,
} from "lucide-react";
import {
  FancyButton,
  MarchingBorder,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatCard,
} from "@/components/ui/cubby-ui";

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

  const pauseCardInner = (
    <Card elevation="raised" className="h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Factory Emergency Circuit</span>
          </CardTitle>
          <Badge variant={isPaused ? "warning" : "success"} dot pulse={isPaused}>
            {isPaused ? "PAUSED" : "OPERATIONAL"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Halt contract-level creation in case of critical vulnerability. Existing funds stay locked in immutable vaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3.5 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/[0.06] text-[11px] text-slate-400">
          <strong className="text-slate-200">Security Invariant:</strong> Platform admin never holds custody of funds and cannot block backer refund claims.
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
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Platform Governance & Telemetry</h1>
                <Badge variant="cyan">Admin Mode</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Non-custodial smart protocol parameter controls, automated circuit breakers, and flag deliberation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            Admin: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Campaigns"
          value={campaigns.filter((c) => c.status === "Active").length.toString()}
          unit="pools"
          delta={{
            value: "+12%",
            trend: "up",
            label: "vs last week",
          }}
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Platform Take-Rate"
          value={(platformFeeBps / 100).toFixed(2)}
          unit="%"
          delta={{
            value: `${platformFeeBps} bps`,
            trend: "neutral",
            label: "capped at 5%",
          }}
          icon={<DollarSign className="w-4 h-4 text-cyan-400" />}
        />
        <StatCard
          title="Factory State"
          value={isPaused ? "PAUSED" : "ACTIVE"}
          delta={{
            value: isPaused ? "Paused" : "Active",
            trend: isPaused ? "down" : "up",
            label: isPaused ? "Creations halted" : "Accepting deployments",
          }}
          icon={<Lock className="w-4 h-4 text-amber-400" />}
        />
        <StatCard
          title="Treasury Vault"
          value={contractAddresses.treasury.slice(0, 6)}
          unit={`..${contractAddresses.treasury.slice(-4)}`}
          delta={{
            value: "Multi-sig",
            trend: "neutral",
            label: "Gnosis Safe",
          }}
          icon={<Vault className="w-4 h-4 text-purple-400" />}
        />
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
        <Card elevation="raised">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Protocol Fee Adjuster</span>
              </CardTitle>
              <Badge variant="cyan" className="font-mono">
                Current: {(platformFeeBps / 100).toFixed(2)}%
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Platform take-rate deducted upon successful milestone completion. Hard-capped at 500 bps (5.00%).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs">
                <label className="text-slate-300 font-semibold">Configured Basis Points (bps)</label>
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
                <span>0.00% (0 bps)</span>
                <span>2.00% (Default)</span>
                <span>5.00% (Max Cap)</span>
              </div>
            </div>

            <FancyButton
              onClick={handleUpdateFee}
              disabled={isSubmitting || newFee === platformFeeBps}
              variant="primary"
              className="w-full justify-center"
              size="md"
            >
              {isSubmitting ? "Broadcasting..." : "Save Fee On-Chain (FR-30)"}
            </FancyButton>
          </CardContent>
        </Card>

        {/* Card 2: Factory Emergency Pause (FR-29) */}
        {isPaused ? (
          <MarchingBorder borderRadius={16} strokeColor="#f59e0b" duration={5}>
            {pauseCardInner}
          </MarchingBorder>
        ) : (
          pauseCardInner
        )}
      </div>

      {/* Flag / Moderation Card (FR-31) */}
      <Card elevation="raised">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-base text-rose-400">
              <Flag className="w-4 h-4" />
              <span>Campaign Delisting & Backer Protection (FR-31)</span>
            </CardTitle>
            <Badge variant="danger">Escrow Safety</Badge>
          </div>
          <CardDescription className="text-xs">
            If a campaign violates safety criteria or fraudulent behavior is verified, delisting marks it cancelled, unlocking instant 100% principal refunds to all backers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Active Pool</label>
              <select
                value={selectedCampaignToFlag}
                onChange={(e) => setSelectedCampaignToFlag(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Cancellation</label>
              <input
                type="text"
                placeholder="e.g. Identity fraud or failed milestone verification"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
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
              Confirm Flag & Enable Backer Refunds
            </FancyButton>
          </div>
        </CardContent>
      </Card>

      {/* Contract Infrastructure Explorer */}
      <Card elevation="raised">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Deployed On-Chain Architecture</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Verifiable EIP-1167 proxy clones, master implementation bytecode, and multisig treasury routing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/[0.08] space-y-1">
              <span className="text-slate-500">Campaign Factory:</span>
              <p className="font-mono text-emerald-400 break-all">{contractAddresses.factory}</p>
            </div>
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/[0.08] space-y-1">
              <span className="text-slate-500">Master Clone Implementation:</span>
              <p className="font-mono text-slate-300 break-all">{contractAddresses.implementation}</p>
            </div>
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.02_260)] border border-white/[0.08] space-y-1">
              <span className="text-slate-500">Fee Treasury Multisig:</span>
              <p className="font-mono text-slate-300 break-all">{contractAddresses.treasury}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
