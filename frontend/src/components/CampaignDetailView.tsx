"use client";

import React, { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Campaign, CampaignStatus } from "@/types/crowdfunding";
import {
  ArrowLeft,
  Clock,
  Users,
  Shield,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  QrCode as QrIcon,
} from "lucide-react";
import { CircularSlider } from "@/components/ui/cubby-ui/circular-slider";
import { Meter } from "@/components/ui/cubby-ui/meter";
import { Timeline, TimelineEntry } from "@/components/ui/cubby-ui/timeline";
import { QRCode } from "@/components/ui/cubby-ui/qr-code";
import { FancyButton } from "@/components/ui/cubby-ui/fancy-button";
import { MarchingBorder } from "@/components/ui/cubby-ui/marching-border";
import { Kbd } from "@/components/ui/cubby-ui/kbd";

interface CampaignDetailViewProps {
  campaignAddress: string;
  onBack: () => void;
}

export const CampaignDetailView: React.FC<CampaignDetailViewProps> = ({
  campaignAddress,
  onBack,
}) => {
  const {
    account,
    campaigns,
    contribute,
    withdraw,
    claimRefund,
    cancelCampaign,
    postUpdate,
    contractAddresses,
  } = useWeb3();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contributionAmount, setContributionAmount] = useState<number>(0.1);
  const [activeTab, setActiveTab] = useState<"story" | "updates" | "contributors" | "contract">("story");
  const [anonymousContributors, setAnonymousContributors] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateTitle, setUpdateTitle] = useState<string>("");
  const [updateContent, setUpdateContent] = useState<string>("");

  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const found = campaigns.find(
      (c) => c.address.toLowerCase() === campaignAddress.toLowerCase()
    );
    if (found) {
      setCampaign(found);
    }
  }, [campaigns, campaignAddress]);

  if (!campaign) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-slate-400">Campaign not found.</p>
        <FancyButton variant="default" onClick={onBack}>
          Back to Explore
        </FancyButton>
      </div>
    );
  }

  const isCreator = account.toLowerCase() === campaign.creator.toLowerCase();
  const raised = parseFloat(campaign.totalRaised);
  const goal = parseFloat(campaign.goal);
  const percentFunded = (raised / goal) * 100;
  const isGoalMet = raised >= goal;
  const isDeadlinePassed = currentTime > 0 ? currentTime >= campaign.deadline : false;

  // Real-time status logic mirroring smart contract
  let currentStatus: CampaignStatus = campaign.status;
  if (campaign.cancelled) currentStatus = "Cancelled";
  else if (campaign.withdrawn) currentStatus = "Withdrawn";
  else if (!isDeadlinePassed) currentStatus = "Active";
  else if (isGoalMet) currentStatus = "Successful";
  else currentStatus = "Failed";

  // Check my contribution to this campaign
  const myContributions = campaign.contributors.filter(
    (ct) => ct.address.toLowerCase() === account.toLowerCase()
  );
  const myTotalContributed = myContributions.reduce((sum, ct) => sum + parseFloat(ct.amount), 0);
  const isRefundEligible =
    (currentStatus === "Failed" || currentStatus === "Cancelled") && myTotalContributed > 0;

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContribute = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await contribute(campaign.address, contributionAmount.toString());
      setSuccessMsg(`Successfully pledged ${contributionAmount} ETH to campaign escrow!`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Contribution failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await withdraw(campaign.address);
      setSuccessMsg("Withdrawal processed! Creator payout and platform fee split atomically.");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Withdrawal failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimRefund = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await claimRefund(campaign.address);
      setSuccessMsg(`Refund of ${myTotalContributed.toFixed(3)} ETH claimed successfully! Zero fees deducted.`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Refund claim failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!confirm("Are you sure you want to cancel this campaign? This action is irreversible.")) return;
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      await cancelCampaign(campaign.address);
      setSuccessMsg("Campaign cancelled.");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Cancellation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!updateTitle.trim() || !updateContent.trim()) return;
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      await postUpdate(campaign.address, updateTitle, updateContent);
      setShowUpdateModal(false);
      setUpdateTitle("");
      setUpdateContent("");
      setSuccessMsg("Milestone update broadcasted to on-chain log!");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to post update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = (deadlineSec: number) => {
    if (!currentTime) return "Calculating time remaining...";
    const diff = deadlineSec - currentTime;
    if (diff <= 0) return "Campaign deadline ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m remaining`;
  };

  const maskAddress = (addr: string) => {
    if (anonymousContributors) {
      return `0x***...${addr.slice(-4)}`;
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Convert campaign updates into Cubby UI Timeline entries
  const timelineEntries: TimelineEntry[] = campaign.updates.map((upd, idx) => ({
    id: upd.cid || idx,
    title: upd.title,
    description: upd.content,
    timestamp: upd.timestamp,
    cid: upd.cid,
    status: idx === 0 ? "current" : "completed",
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>

        <div className="flex items-center gap-2">
          <FancyButton
            variant="default"
            size="xs"
            onClick={() => setShowQRModal(true)}
            leftIcon={<QrIcon className="w-3.5 h-3.5" />}
          >
            Direct QR
          </FancyButton>
        </div>
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

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.04] text-emerald-300 border border-emerald-500/30">
            {campaign.category}
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-400 border border-white/[0.08] bg-white/[0.02]">
            EIP-1167 Clone: {campaign.address.slice(0, 8)}...{campaign.address.slice(-6)}
          </span>
          {currentStatus === "Active" && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ● ACTIVE ESCROW
            </span>
          )}
          {currentStatus === "Successful" && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              ✓ 100% FUNDED
            </span>
          )}
          {currentStatus === "Withdrawn" && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              ✓ CREATOR PAID
            </span>
          )}
          {(currentStatus === "Failed" || currentStatus === "Cancelled") && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              ✕ REFUND READY
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          {campaign.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          {campaign.summary}
        </p>

        <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
          <span>Campaign Creator:</span>
          <button
            onClick={() => handleCopyAddress(campaign.creator)}
            className="font-mono text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>{campaign.creator}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
          {isCreator && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              YOU
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Media & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Media, Guarantee Banner, Tabs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/[0.08] shadow-2xl aspect-video">
            <img
              src={campaign.coverImage}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-[#0c1017] border border-white/[0.08] flex items-start space-x-3.5 shadow-md">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-white">Trustless All-or-Nothing Escrow</span>
              <p className="text-slate-400 leading-relaxed">
                Smart contract logic autonomously holds all ETH contributions. If the campaign fails to hit its
                target of {campaign.goal} ETH by deadline, every contributor can reclaim 100% of their ETH with
                zero platform deductions.
              </p>
            </div>
          </div>

          {/* Segmented Tabs Bar */}
          <div className="space-y-4">
            <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] space-x-1">
              {[
                { id: "story", label: "Project Story" },
                { id: "updates", label: `Milestones (${campaign.updates.length})` },
                { id: "contributors", label: `Backers (${campaign.contributors.length})` },
                { id: "contract", label: "On-Chain Specs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Project Story */}
            {activeTab === "story" && (
              <div className="bg-[#0c1017] rounded-2xl border border-white/[0.08] p-6 text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md">
                {campaign.description}
              </div>
            )}

            {/* Tab: Milestones via Cubby UI Timeline Component */}
            {activeTab === "updates" && (
              <div className="bg-[#0c1017] rounded-2xl border border-white/[0.08] p-6 space-y-6 shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Project Milestones & Updates</h3>
                  {isCreator && (
                    <FancyButton
                      variant="primary"
                      size="xs"
                      onClick={() => setShowUpdateModal(true)}
                    >
                      + Post Milestone
                    </FancyButton>
                  )}
                </div>

                <Timeline entries={timelineEntries} />
              </div>
            )}

            {/* Tab: Contributors Ledger */}
            {activeTab === "contributors" && (
              <div className="bg-[#0c1017] rounded-2xl border border-white/[0.08] p-6 space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {campaign.contributors.length} total on-chain backers
                  </span>
                  <button
                    onClick={() => setAnonymousContributors(!anonymousContributors)}
                    className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    {anonymousContributors ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{anonymousContributors ? "Reveal Addresses" : "Anonymous Mode (FR-16)"}</span>
                  </button>
                </div>

                {campaign.contributors.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Be the first backer to support this project!
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] overflow-hidden">
                    {campaign.contributors.map((ct, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs bg-white/[0.01]">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono text-emerald-400">
                            #{idx + 1}
                          </div>
                          <div>
                            <span className="font-mono text-slate-200">{maskAddress(ct.address)}</span>
                            {ct.address.toLowerCase() === account.toLowerCase() && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-emerald-400">{ct.amount} ETH</span>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(ct.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Contract & Security with SVG QR Code */}
            {activeTab === "contract" && (
              <div className="bg-[#0c1017] rounded-2xl border border-white/[0.08] p-6 space-y-6 shadow-md">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <QRCode value={campaign.address} size={130} label="Campaign Contract" />

                  <div className="flex-1 space-y-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-medium">Campaign Clone Address (EIP-1167):</span>
                      <p className="font-mono text-emerald-400 break-all">{campaign.address}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-medium">Master Implementation:</span>
                      <p className="font-mono text-slate-300 break-all">{contractAddresses.implementation}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-medium">Factory Address:</span>
                      <p className="font-mono text-slate-300 break-all">{contractAddresses.factory}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-medium">IPFS Metadata CID:</span>
                      <p className="font-mono text-slate-300 break-all">{campaign.metadataCID}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-xs text-slate-400">
                  <span>Platform Fee Policy:</span>
                  <span className="text-white font-medium">{campaign.feeBps / 100}% on successful campaigns only</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Funding Progress & Cubby Circular Dial Widget */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative bg-[#0c1017] rounded-3xl border border-white/[0.08] p-6 space-y-6 shadow-2xl">
            {/* Marching border on active campaigns */}
            {currentStatus === "Active" && (
              <MarchingBorder
                strokeWidth={1.5}
                dash={1}
                gap={0.8}
                duration={1.2}
                className="text-emerald-500/40"
              />
            )}

            {/* Numbers & Segmented Meter */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-3xl font-black font-mono text-white tracking-tight">{campaign.totalRaised} ETH</span>
                  <span className="text-xs text-slate-400 ml-2">pledged</span>
                </div>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {Math.round(percentFunded)}%
                </span>
              </div>

              {/* Segmented Meter Component */}
              <Meter
                value={percentFunded}
                segments={26}
                size="md"
              />

              <div className="flex justify-between items-center text-xs text-slate-400 font-mono pt-1">
                <span>Goal: <strong className="text-white">{campaign.goal} ETH</strong></span>
                <span>{campaign.contributorsCount} Backers</span>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{formatCountdown(campaign.deadline)}</span>
              </div>
              <Kbd size="xs">Live</Kbd>
            </div>

            {/* Interactive Widget 1: Radial Dial & Contribution Input (Active Status) */}
            {currentStatus === "Active" && (
              <div className="space-y-5 pt-3 border-t border-white/[0.08]">
                {/* Circular Slider Component */}
                <div className="flex justify-center py-1">
                  <CircularSlider
                    value={contributionAmount}
                    min={0.01}
                    max={5.0}
                    step={0.05}
                    onChange={(val) => setContributionAmount(val)}
                    size={170}
                    strokeWidth={9}
                  />
                </div>

                {/* Quick Selection Chips */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Preset Presets:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.05, 0.1, 0.5, 1.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setContributionAmount(amt)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                          contributionAmount === amt
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                            : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] border-white/[0.08]"
                        }`}
                      >
                        +{amt} ETH
                      </button>
                    ))}
                  </div>
                </div>

                {isCreator ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    You are connected as the campaign creator. Per FR-9, creators cannot contribute to their own project.
                  </div>
                ) : (
                  <FancyButton
                    variant="primary"
                    size="lg"
                    onClick={handleContribute}
                    isLoading={isSubmitting}
                    className="w-full text-sm font-black"
                  >
                    Back Campaign with {contributionAmount} ETH
                  </FancyButton>
                )}
              </div>
            )}

            {/* Interactive Widget 2: Creator Withdrawal (Successful Status) */}
            {currentStatus === "Successful" && (
              <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Goal Reached! Ready for Payout</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Raised:</span>
                      <span className="font-mono font-bold text-white">{campaign.totalRaised} ETH</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Platform Fee (2%):</span>
                      <span className="font-mono">{(raised * 0.02).toFixed(3)} ETH</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-400 border-t border-white/[0.08] pt-1">
                      <span>Creator Payout:</span>
                      <span className="font-mono">{(raised * 0.98).toFixed(3)} ETH</span>
                    </div>
                  </div>
                </div>

                {isCreator ? (
                  <FancyButton
                    variant="cyan"
                    size="lg"
                    onClick={handleWithdraw}
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    Withdraw Funds (FR-18)
                  </FancyButton>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    Only the creator ({campaign.creator.slice(0, 8)}...) can trigger the on-chain payout.
                  </p>
                )}
              </div>
            )}

            {/* Interactive Widget 3: Pull Refund (Failed or Cancelled Status) */}
            {(currentStatus === "Failed" || currentStatus === "Cancelled") && (
              <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Campaign Unsuccessful</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The campaign did not reach its goal before the deadline. Funds are protected by code. Every
                    contributor can claim a 100% full refund with zero fees deducted.
                  </p>
                  {myTotalContributed > 0 && (
                    <div className="p-2 rounded bg-black/40 text-emerald-400 font-mono text-center font-bold">
                      Your Refundable Balance: {myTotalContributed.toFixed(3)} ETH
                    </div>
                  )}
                </div>

                {isRefundEligible ? (
                  <FancyButton
                    variant="primary"
                    size="lg"
                    onClick={handleClaimRefund}
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    Claim 100% Refund ({myTotalContributed.toFixed(3)} ETH)
                  </FancyButton>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    {myTotalContributed === 0
                      ? "No active contribution from this wallet to refund."
                      : "Refund already processed."}
                  </p>
                )}
              </div>
            )}

            {/* Creator Cancel Action */}
            {isCreator && currentStatus === "Active" && raised === 0 && (
              <div className="pt-2 border-t border-white/[0.08]">
                <FancyButton
                  variant="subtle"
                  size="sm"
                  onClick={handleCancelCampaign}
                  isLoading={isSubmitting}
                  className="w-full text-rose-400 hover:text-rose-300"
                >
                  Cancel Campaign (0 ETH Raised)
                </FancyButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-white/[0.12] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Direct Mobile Contribution</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Scan with MetaMask, Rainbow, or Rabby on your mobile phone to donate directly to the smart contract escrow.
            </p>

            <QRCode
              value={campaign.address}
              size={180}
              label={campaign.title}
              sublabel={campaign.address}
            />

            <FancyButton
              variant="default"
              size="sm"
              onClick={() => setShowQRModal(false)}
              className="w-full"
            >
              Done
            </FancyButton>
          </div>
        </div>
      )}

      {/* Milestone Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-white/[0.12] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white">Post Creator Milestone Update</h3>
            <p className="text-xs text-slate-400">
              Broadcasts an immutable update to all project backers on-chain.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Smart contracts audited & verified"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content (Markdown)</label>
                <textarea
                  rows={4}
                  placeholder="Describe recent milestones, deliverables, and next steps..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <FancyButton
                variant="default"
                size="sm"
                onClick={() => setShowUpdateModal(false)}
              >
                Cancel
              </FancyButton>
              <FancyButton
                variant="primary"
                size="sm"
                onClick={handlePostUpdate}
                disabled={isSubmitting || !updateTitle || !updateContent}
                isLoading={isSubmitting}
              >
                Publish On-Chain
              </FancyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
