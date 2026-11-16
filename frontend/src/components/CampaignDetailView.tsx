"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useWeb3 } from "@/context/Web3Context";
import { CampaignStatus, Contributor } from "@/types/crowdfunding";
import { ethers } from "ethers";
import {
  ArrowLeft,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  QrCode as QrIcon,
  Coins,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Ban,
} from "lucide-react";
import {
  Meter,
  Timeline,
  TimelineEntry,
  QRCode,
  FancyButton,
  Badge,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
} from "@/components/ui/cubby-ui";

interface CampaignDetailViewProps {
  campaignAddress: string;
}

const PRESET_AMOUNTS = ["0.01", "0.05", "0.1", "0.5", "1.0", "5.0"];

export const CampaignDetailView: React.FC<CampaignDetailViewProps> = ({
  campaignAddress,
}) => {
  const {
    wallet,
    campaigns,
    contribute,
    withdraw,
    withdrawTo,
    refund,
    cancel,
    postUpdate,
    getUserContribution,
    getPaginatedContributors,
    connectWallet,
    txState,
    targetChainId,
  } = useWeb3();

  const campaign = useMemo(() => {
    return (
      campaigns.find(
        (c) => c.address.toLowerCase() === campaignAddress.toLowerCase()
      ) || null
    );
  }, [campaigns, campaignAddress]);

  const [contributionInput, setContributionInput] = useState<string>("0.1");
  const [activeTab, setActiveTab] = useState<string>("story");
  const [anonymousContributors, setAnonymousContributors] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // withdrawTo modal state
  const [showWithdrawToModal, setShowWithdrawToModal] = useState<boolean>(false);
  const [redirectRecipient, setRedirectRecipient] = useState<string>("");

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateTitle, setUpdateTitle] = useState<string>("");
  const [updateContent, setUpdateContent] = useState<string>("");

  // User contribution amount
  const [myPledgedWei, setMyPledgedWei] = useState<bigint>(0n);

  // Paginated contributors
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loadingContributors, setLoadingContributors] = useState<boolean>(false);
  const [contributorPage, setContributorPage] = useState<number>(0);
  const PAGE_SIZE = 10;

  // Real-time block timestamp approximation
  const [currentTime, setCurrentTime] = useState<number>(() =>
    Math.floor(Date.now() / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user's personal contribution
  useEffect(() => {
    let active = true;
    if (wallet.address && campaignAddress) {
      getUserContribution(campaignAddress, wallet.address).then((amt) => {
        if (active) setMyPledgedWei(amt);
      });
    } else {
      Promise.resolve().then(() => {
        if (active) setMyPledgedWei(0n);
      });
    }
    return () => {
      active = false;
    };
  }, [wallet.address, campaignAddress, getUserContribution]);

  // Fetch paginated contributors
  const loadContributors = useCallback(async () => {
    if (!campaignAddress) return;
    await Promise.resolve();
    setLoadingContributors(true);
    try {
      const list = await getPaginatedContributors(
        campaignAddress,
        contributorPage * PAGE_SIZE,
        PAGE_SIZE
      );
      setContributors(list);
    } catch {
      // ignore
    } finally {
      setLoadingContributors(false);
    }
  }, [campaignAddress, contributorPage, getPaginatedContributors]);

  useEffect(() => {
    loadContributors();
  }, [loadContributors]);

  if (!campaign) {
    return (
      <div className="text-center py-24 space-y-4">
        <Coins className="w-10 h-10 text-emerald-400 animate-pulse mx-auto" />
        <h2 className="text-xl font-bold text-white">Loading Campaign Escrow...</h2>
        <p className="text-xs text-slate-400 font-mono">
          Querying contract at {campaignAddress}
        </p>
        <Link href="/">
          <FancyButton variant="default" size="sm">
            Back to Explore
          </FancyButton>
        </Link>
      </div>
    );
  }

  const isCreator =
    !!wallet.address &&
    !!campaign.creator &&
    wallet.address.toLowerCase() === campaign.creator.toLowerCase();

  const percentFunded =
    campaign.goal > 0n
      ? Number((campaign.totalRaised * 10000n) / campaign.goal) / 100
      : 0;

  const secondsRemaining = Number(campaign.deadline) - currentTime;

  // Dynamic status display
  const getStatusBadge = () => {
    switch (campaign.status) {
      case CampaignStatus.Active:
        return (
          <Badge variant="success" size="sm" dot pulse>
            ACTIVE ESCROW
          </Badge>
        );
      case CampaignStatus.Withdrawn:
        return (
          <Badge variant="cyan" size="sm">
            FUNDS WITHDRAWN
          </Badge>
        );
      case CampaignStatus.Successful:
        return (
          <Badge variant="cyan" size="sm">
            SUCCESSFUL
          </Badge>
        );
      case CampaignStatus.Cancelled:
        return (
          <Badge variant="warning" size="sm">
            CANCELLED
          </Badge>
        );
      case CampaignStatus.Failed:
      default:
        return (
          <Badge variant="destructive" size="sm">
            FAILED
          </Badge>
        );
    }
  };

  const formatCountdown = (diff: number) => {
    if (diff <= 0) return "Campaign Ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s left`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Contribute action
  const handleContribute = async () => {
    if (!wallet.isConnected) {
      await connectWallet();
      return;
    }

    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await contribute(campaign.address, contributionInput);
      setActionSuccess(`Successfully pledged ${contributionInput} ETH to campaign escrow!`);
      loadContributors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Contribution failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Withdraw action
  const handleWithdraw = async () => {
    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await withdraw(campaign.address);
      setActionSuccess("Creator payout successfully withdrawn!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WithdrawTo action
  const handleWithdrawTo = async () => {
    if (!ethers.isAddress(redirectRecipient)) {
      setActionError("Please provide a valid recipient address.");
      return;
    }
    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await withdrawTo(campaign.address, redirectRecipient);
      setActionSuccess(`Creator payout successfully sent to ${redirectRecipient}!`);
      setShowWithdrawToModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "WithdrawTo failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refund action
  const handleRefund = async () => {
    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await refund(campaign.address);
      setActionSuccess("100% full refund successfully reclaimed to your wallet!");
      setMyPledgedWei(0n);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refund failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel action
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this campaign? This action is irreversible.")) {
      return;
    }
    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await cancel(campaign.address);
      setActionSuccess("Campaign successfully cancelled.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post update action
  const handlePostUpdate = async () => {
    if (!updateTitle.trim() || !updateContent.trim()) {
      setActionError("Please fill out both the update title and content.");
      return;
    }
    try {
      setActionError(null);
      setActionSuccess(null);
      setIsSubmitting(true);
      await postUpdate(campaign.address, updateTitle, updateContent);
      setActionSuccess("Milestone update broadcasted on-chain!");
      setShowUpdateModal(false);
      setUpdateTitle("");
      setUpdateContent("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Posting update failed.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timelineEntries: TimelineEntry[] = [
    {
      id: "init",
      timestamp: new Date(Number(campaign.deadline) * 1000 - 86400000 * 30).toLocaleDateString(),
      title: "Campaign Logic Initialized",
      description: `EIP-1167 proxy initialized with a ${ethers.formatEther(campaign.goal)} ETH goal target.`,
      status: "completed",
    },
    ...(campaign.updates || []).map((u, idx) => ({
      id: u.id || `update-${idx}`,
      timestamp: new Date(Number(u.timestamp)).toLocaleDateString(),
      title: u.title,
      description: u.content,
      status: "completed" as const,
    })),
  ];

  const explorerBaseUrl =
    targetChainId === 11155111
      ? "https://sepolia.etherscan.io"
      : "https://etherscan.io";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Back Link & Header */}
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Escrows</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Badge variant="cyan" size="sm">
              {campaign.category}
            </Badge>
            {getStatusBadge()}
            {campaign.status === CampaignStatus.Active && (
              <span className="flex items-center space-x-1.5 text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatCountdown(secondsRemaining)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(campaign.address)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 transition-colors"
            >
              <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 transition-colors"
              title="Show Contract QR Code"
            >
              <QrIcon className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {campaign.title}
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          {campaign.summary}
        </p>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {txState.status === "pending" && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Transaction pending on-chain...</span>
          </div>
          {txState.txHash && (
            <a
              href={`${explorerBaseUrl}/tx/${txState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] underline"
            >
              <span>View on Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

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
                target of {ethers.formatEther(campaign.goal)} ETH by the deadline, every contributor can reclaim
                100% of their ETH with zero platform deductions.
              </p>
            </div>
          </div>

          {/* Detailed Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-white/[0.08] pb-px bg-transparent p-0 rounded-none">
              <TabsTrigger
                value="story"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-white rounded-none px-4 py-2.5 text-xs font-semibold text-slate-400"
              >
                Story & Details
              </TabsTrigger>
              <TabsTrigger
                value="updates"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-white rounded-none px-4 py-2.5 text-xs font-semibold text-slate-400"
              >
                Updates ({campaign.updates?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="contributors"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-white rounded-none px-4 py-2.5 text-xs font-semibold text-slate-400"
              >
                Backers ({campaign.contributorCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="pt-6">
              <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed space-y-4 whitespace-pre-wrap font-sans">
                {campaign.description}
              </div>
            </TabsContent>

            <TabsContent value="updates" className="pt-6 space-y-6">
              {isCreator && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">
                    Broadcast a verified progress milestone to backers
                  </span>
                  <FancyButton
                    variant="glow"
                    size="sm"
                    onClick={() => setShowUpdateModal(true)}
                  >
                    Post Milestone Update
                  </FancyButton>
                </div>
              )}

              <Timeline entries={timelineEntries} />
            </TabsContent>

            <TabsContent value="contributors" className="pt-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.06]">
                <span>Total Backers: {campaign.contributorCount}</span>
                <button
                  onClick={() => setAnonymousContributors(!anonymousContributors)}
                  className="flex items-center space-x-1.5 hover:text-white transition-colors"
                >
                  {anonymousContributors ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{anonymousContributors ? "Show Addresses" : "Hide Addresses"}</span>
                </button>
              </div>

              {loadingContributors ? (
                <p className="text-xs text-slate-400 py-6 text-center animate-pulse">
                  Loading paginated backer ledger...
                </p>
              ) : contributors.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No public contributions recorded on this contract yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {contributors.map((ct, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar address={ct.address} size="sm" />
                        <span className="text-slate-300">
                          {anonymousContributors
                            ? `Backer #${idx + 1}`
                            : `${ct.address.slice(0, 8)}...${ct.address.slice(-6)}`}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {ethers.formatEther(ct.amount)} ETH
                      </span>
                    </div>
                  ))}

                  {/* Pagination Buttons */}
                  {campaign.contributorCount > PAGE_SIZE && (
                    <div className="flex justify-between items-center pt-2">
                      <FancyButton
                        variant="default"
                        size="sm"
                        disabled={contributorPage === 0}
                        onClick={() => setContributorPage((p) => Math.max(0, p - 1))}
                      >
                        Previous Page
                      </FancyButton>
                      <span className="text-xs text-slate-400 font-mono">
                        Page {contributorPage + 1}
                      </span>
                      <FancyButton
                        variant="default"
                        size="sm"
                        disabled={(contributorPage + 1) * PAGE_SIZE >= campaign.contributorCount}
                        onClick={() => setContributorPage((p) => p + 1)}
                      >
                        Next Page
                      </FancyButton>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (5 cols): Funding Widget & Escrow State */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-[#0c1017] border border-white/[0.1] shadow-2xl space-y-6">
            {/* Funding Metrics Header */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-white font-mono">
                    {ethers.formatEther(campaign.totalRaised)} ETH
                  </span>
                  <p className="text-xs text-slate-400">
                    pledged of {ethers.formatEther(campaign.goal)} ETH goal
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {percentFunded.toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-slate-500 uppercase font-mono">Funded</p>
                </div>
              </div>

              <Meter
                value={percentFunded}
                label={`${ethers.formatEther(campaign.totalRaised)} / ${ethers.formatEther(campaign.goal)} ETH`}
                segments={24}
                size="md"
              />

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Backers</span>
                  <span className="text-white font-bold text-sm">{campaign.contributorCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Time Left</span>
                  <span className="text-white font-bold text-sm">
                    {campaign.status === CampaignStatus.Active
                      ? formatCountdown(secondsRemaining)
                      : "Concluded"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contribution Widget (Active Campaigns) */}
            {campaign.status === CampaignStatus.Active && (
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <span className="text-xs font-bold text-white block">Pledge ETH to Escrow</span>

                {/* Preset Amount Chips */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setContributionInput(amt)}
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                        contributionInput === amt
                          ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                          : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.08]"
                      }`}
                    >
                      {amt} ETH
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="relative">
                  <Coins className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contributionInput}
                    onChange={(e) => setContributionInput(e.target.value)}
                    placeholder="Custom ETH amount"
                    className="w-full pl-10 pr-14 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    ETH
                  </span>
                </div>

                <FancyButton
                  variant="glow"
                  size="lg"
                  onClick={handleContribute}
                  disabled={isSubmitting}
                  className="w-full gap-2 justify-center"
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isSubmitting
                      ? "Pledging..."
                      : wallet.isConnected
                      ? `Contribute ${contributionInput} ETH`
                      : "Connect Wallet to Contribute"}
                  </span>
                </FancyButton>
              </div>
            )}

            {/* Backer Refund Option (Failed or Cancelled Campaigns) */}
            {(campaign.status === CampaignStatus.Failed || campaign.status === CampaignStatus.Cancelled) && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-amber-300">100% Refund Window Open</span>
                    <p className="text-slate-400 leading-relaxed">
                      This campaign did not meet its funding target or was cancelled. Every contributor may
                      reclaim their full contribution.
                    </p>
                  </div>
                </div>

                {myPledgedWei > 0n ? (
                  <div className="pt-2 border-t border-amber-500/20 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Your claimable refund:</span>
                      <span className="text-emerald-400 font-bold">
                        {ethers.formatEther(myPledgedWei)} ETH
                      </span>
                    </div>
                    <FancyButton
                      variant="glow"
                      size="md"
                      onClick={handleRefund}
                      disabled={isSubmitting}
                      className="w-full justify-center"
                    >
                      <span>Claim 100% Full Refund</span>
                    </FancyButton>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Connected wallet has 0 ETH pledged to this campaign.
                  </p>
                )}
              </div>
            )}

            {/* Creator Actions Card */}
            {isCreator && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                <span className="text-xs font-bold text-purple-300 block uppercase tracking-wider font-mono">
                  Creator Controls (Verified Owner)
                </span>

                {/* Successful Payout Withdrawal */}
                {campaign.status === CampaignStatus.Successful && !campaign.withdrawn && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Goal reached! Withdraw the net payout (platform fee will be deducted for treasury).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <FancyButton
                        variant="glow"
                        size="sm"
                        onClick={handleWithdraw}
                        disabled={isSubmitting}
                      >
                        Withdraw to Sender
                      </FancyButton>
                      <FancyButton
                        variant="default"
                        size="sm"
                        onClick={() => setShowWithdrawToModal(true)}
                        disabled={isSubmitting}
                      >
                        Withdraw To...
                      </FancyButton>
                    </div>
                  </div>
                )}

                {/* Cancel Campaign Button (Active & no contributions) */}
                {campaign.status === CampaignStatus.Active && campaign.contributorCount === 0 && (
                  <FancyButton
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Campaign</span>
                  </FancyButton>
                )}
              </div>
            )}
          </Card>

          {/* Contract Metadata Details */}
          <div className="p-4 rounded-2xl bg-[#0c1017] border border-white/[0.08] text-xs space-y-2 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Contract Address:</span>
              <a
                href={`${explorerBaseUrl}/address/${campaign.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Creator Address:</span>
              <span className="text-white">{campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Metadata CID:</span>
              <span className="text-slate-300 truncate max-w-[180px]">
                {campaign.metadataCID.slice(0, 16)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0e121a] border border-white/[0.12] rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="font-bold text-white text-base">Escrow Contract QR Code</h3>
            <div className="p-4 bg-white rounded-xl mx-auto w-fit">
              <QRCode value={campaign.address} size={180} />
            </div>
            <p className="text-[11px] font-mono text-slate-400 break-all">{campaign.address}</p>
            <FancyButton
              variant="default"
              size="sm"
              onClick={() => setShowQRModal(false)}
              className="w-full"
            >
              Close
            </FancyButton>
          </div>
        </div>
      )}

      {/* WithdrawTo Modal */}
      {showWithdrawToModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0e121a] border border-white/[0.12] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-white text-base">Redirect Creator Payout (withdrawTo)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Redirect funds to an alternative address or multisig wallet. Useful if your creator account
              is a contract without a payable receive method.
            </p>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Recipient Address (0x...):
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={redirectRecipient}
                onChange={(e) => setRedirectRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <FancyButton
                variant="default"
                size="sm"
                onClick={() => setShowWithdrawToModal(false)}
              >
                Cancel
              </FancyButton>
              <FancyButton
                variant="glow"
                size="sm"
                onClick={handleWithdrawTo}
                disabled={isSubmitting}
              >
                Confirm Payout Redirect
              </FancyButton>
            </div>
          </div>
        </div>
      )}

      {/* Post Milestone Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0e121a] border border-white/[0.12] rounded-2xl p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-white text-base">Broadcast Milestone Update</h3>
            <p className="text-xs text-slate-400">
              This update will be pinned to IPFS and permanently recorded on the campaign contract.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Update Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Audit Complete & Phase 1 Deployed"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Update Details:</label>
                <textarea
                  rows={4}
                  placeholder="Provide details for your backers..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <FancyButton
                variant="default"
                size="sm"
                onClick={() => setShowUpdateModal(false)}
              >
                Cancel
              </FancyButton>
              <FancyButton
                variant="glow"
                size="sm"
                onClick={handlePostUpdate}
                disabled={isSubmitting}
              >
                Broadcast Update
              </FancyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
