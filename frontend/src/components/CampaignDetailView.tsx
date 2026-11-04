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
  Share2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  Layers,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  FileText,
  DollarSign,
} from "lucide-react";

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
  const [contributionAmount, setContributionAmount] = useState<string>("0.1");
  const [activeTab, setActiveTab] = useState<"story" | "updates" | "contributors" | "contract">("story");
  const [anonymousContributors, setAnonymousContributors] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateTitle, setUpdateTitle] = useState<string>("");
  const [updateContent, setUpdateContent] = useState<string>("");

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
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg text-sm"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCreator = account.toLowerCase() === campaign.creator.toLowerCase();
  const raised = parseFloat(campaign.totalRaised);
  const goal = parseFloat(campaign.goal);
  const percentFunded = Math.round((raised / goal) * 100);
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
      await contribute(campaign.address, contributionAmount);
      setSuccessMsg(`Successfully contributed ${contributionAmount} ETH to campaign!`);
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
      setSuccessMsg("Withdrawal processed! Payout and platform fee have been transferred.");
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
      setSuccessMsg("Milestone update posted to on-chain log!");
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
    return `${days} days, ${hours} hours, ${minutes} mins remaining`;
  };

  const maskAddress = (addr: string) => {
    if (anonymousContributors) {
      return `0x***...${addr.slice(-4)}`;
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore</span>
      </button>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-emerald-400 border border-slate-700">
            {campaign.category}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Contract: {campaign.address.slice(0, 10)}...
          </span>
          {currentStatus === "Active" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ● Active Campaign
            </span>
          )}
          {currentStatus === "Successful" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              ✓ Fully Funded (100%+)
            </span>
          )}
          {currentStatus === "Withdrawn" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ✓ Funds Withdrawn by Creator
            </span>
          )}
          {currentStatus === "Failed" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ✕ Goal Missed · 100% Refunds Active
            </span>
          )}
          {currentStatus === "Cancelled" && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ✕ Cancelled · 100% Refunds Active
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {campaign.title}
        </h1>
        <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
          {campaign.summary}
        </p>

        <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
          <span>Created by</span>
          <button
            onClick={() => handleCopyAddress(campaign.creator)}
            className="font-mono text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>{campaign.creator}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
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
        {/* Left Column (8 cols): Media, Guarantee Banner, Tabs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video">
            <img
              src={campaign.coverImage}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Guarantee Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 flex items-start space-x-3.5">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-white">Trustless All-or-Nothing Escrow</span>
              <p className="text-slate-400 leading-relaxed">
                Smart contract logic autonomously holds all ETH contributions. If the campaign fails to hit its
                target of {campaign.goal} ETH by deadline, every contributor can reclaim 100% of their ETH with
                zero platform deductions.
              </p>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="space-y-4">
            <div className="flex items-center border-b border-slate-800 space-x-6">
              <button
                onClick={() => setActiveTab("story")}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === "story" ? "text-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                Project Story
                {activeTab === "story" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                className={`pb-3 text-sm font-semibold transition-colors relative flex items-center space-x-1.5 ${
                  activeTab === "updates" ? "text-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Updates</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {campaign.updates.length}
                </span>
                {activeTab === "updates" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("contributors")}
                className={`pb-3 text-sm font-semibold transition-colors relative flex items-center space-x-1.5 ${
                  activeTab === "contributors" ? "text-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Contributors</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {campaign.contributors.length}
                </span>
                {activeTab === "contributors" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("contract")}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === "contract" ? "text-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                Contract Details
                {activeTab === "contract" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Tab: Project Story */}
            {activeTab === "story" && (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 text-slate-300 space-y-4 text-sm leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </div>
            )}

            {/* Tab: Updates */}
            {activeTab === "updates" && (
              <div className="space-y-4">
                {isCreator && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowUpdateModal(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                    >
                      + Post Creator Milestone Update
                    </button>
                  </div>
                )}
                {campaign.updates.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
                    No milestone updates posted yet.
                  </div>
                ) : (
                  campaign.updates.map((upd, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white text-sm">{upd.title}</span>
                        <span>{new Date(upd.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{upd.content}</p>
                      <div className="text-[10px] font-mono text-emerald-400 pt-1">
                        CID: {upd.cid}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Contributors Ledger */}
            {activeTab === "contributors" && (
              <div className="space-y-4">
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
                  <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
                    Be the first backer to support this project!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
                    {campaign.contributors.map((ct, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-emerald-400">
                            #{idx + 1}
                          </div>
                          <div>
                            <span className="font-mono text-slate-200">{maskAddress(ct.address)}</span>
                            {ct.address.toLowerCase() === account.toLowerCase() && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-emerald-400">{ct.amount} ETH</span>
                          <div className="text-[10px] text-slate-500">
                            {new Date(ct.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Contract & Security */}
            {activeTab === "contract" && (
              <div className="space-y-3 bg-slate-900/70 rounded-2xl border border-slate-800 p-5 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Campaign Clone Address (EIP-1167):</span>
                  <p className="font-mono text-emerald-400 break-all">{campaign.address}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Master Implementation:</span>
                  <p className="font-mono text-slate-300 break-all">{contractAddresses.implementation}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Factory Address:</span>
                  <p className="font-mono text-slate-300 break-all">{contractAddresses.factory}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Metadata CID (IPFS):</span>
                  <p className="font-mono text-slate-300 break-all">{campaign.metadataCID}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-slate-400">
                  <span>Platform Fee Policy:</span>
                  <span className="text-white font-medium">{campaign.feeBps / 100}% on successful campaigns only</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Funding Progress, Contribution Widget, Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Funding Status & Numbers */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            {/* Goal and Raised */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-3xl font-extrabold font-mono text-white">{campaign.totalRaised} ETH</span>
                  <span className="text-xs text-slate-400 ml-2">raised</span>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {percentFunded}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentFunded >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(percentFunded, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                <span>Goal: <strong className="text-white font-mono">{campaign.goal} ETH</strong></span>
                <span>{campaign.contributorsCount} Backers</span>
              </div>
            </div>

            {/* Countdown / Status Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center space-x-3 text-xs">
              <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 font-medium">
                {formatCountdown(campaign.deadline)}
              </span>
            </div>

            {/* Interactive Widget 1: Contribute ETH (Active Status) */}
            {currentStatus === "Active" && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Select or Enter ETH Contribution (Min 0.001 ETH):
                  </label>

                  {/* Quick Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    {["0.05", "0.1", "0.5", "1.0"].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setContributionAmount(amt)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                          contributionAmount === amt
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                        }`}
                      >
                        +{amt} ETH
                      </button>
                    ))}
                  </div>

                  {/* Input with ETH suffix */}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ETH
                    </span>
                  </div>
                </div>

                {isCreator ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    You are connected as the campaign creator. Per FR-9, creators cannot contribute to their own project. Switch to a backer account to contribute.
                  </div>
                ) : (
                  <button
                    onClick={handleContribute}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting on-chain..." : `Back Campaign with ${contributionAmount} ETH`}
                  </button>
                )}
              </div>
            )}

            {/* Interactive Widget 2: Creator Withdrawal (Successful Status) */}
            {currentStatus === "Successful" && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs">
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
                    <div className="flex justify-between font-bold text-emerald-400 border-t border-slate-800/80 pt-1">
                      <span>Creator Payout:</span>
                      <span className="font-mono">{(raised * 0.98).toFixed(3)} ETH</span>
                    </div>
                  </div>
                </div>

                {isCreator ? (
                  <button
                    onClick={handleWithdraw}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing Withdrawal..." : "Withdraw Funds (FR-18)"}
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    Only the creator ({campaign.creator.slice(0, 8)}...) can trigger the on-chain payout.
                  </p>
                )}
              </div>
            )}

            {/* Interactive Widget 3: Contributor Pull Refund (Failed or Cancelled Status) */}
            {(currentStatus === "Failed" || currentStatus === "Cancelled") && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
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
                    <div className="p-2 rounded bg-slate-950 text-emerald-400 font-mono text-center font-bold">
                      Your Refundable Balance: {myTotalContributed.toFixed(3)} ETH
                    </div>
                  )}
                </div>

                {isRefundEligible ? (
                  <button
                    onClick={handleClaimRefund}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Claiming Refund..." : `Claim My Full Refund (${myTotalContributed.toFixed(3)} ETH)`}
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    {myTotalContributed === 0
                      ? "No active contribution from this wallet to refund."
                      : "Refund already processed."}
                  </p>
                )}
              </div>
            )}

            {/* Creator Cancel Action (Only when raised == 0) */}
            {isCreator && currentStatus === "Active" && raised === 0 && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleCancelCampaign}
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs border border-slate-700/60 transition-colors"
                >
                  Cancel Campaign (0 ETH Raised)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Milestone Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Post Creator Milestone Update</h3>
            <p className="text-xs text-slate-400">
              Updates are stored on IPFS and the CID is broadcast on-chain to all backers.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Update Title</label>
                <input
                  type="text"
                  placeholder="e.g. Beta release live on testnet"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Markdown Content</label>
                <textarea
                  rows={4}
                  placeholder="Share details of your progress with backers..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePostUpdate}
                disabled={isSubmitting || !updateTitle || !updateContent}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "Broadcasting..." : "Publish On-Chain Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
