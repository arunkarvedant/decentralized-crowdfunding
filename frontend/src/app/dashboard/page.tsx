"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useWeb3 } from "@/context/Web3Context";
import { CampaignStatus } from "@/types/crowdfunding";
import { ethers } from "ethers";
import {
  Layers,
  Coins,
  Users,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  RotateCcw,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import {
  FancyButton,
  Meter,
  StatCard,
  Badge,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/cubby-ui";

export default function DashboardPage() {
  const {
    wallet,
    campaigns,
    withdraw,
    withdrawTo,
    refund,
    getUserContribution,
    connectWallet,
  } = useWeb3();

  const [activeTab, setActiveTab] = useState<string>("creator");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // withdrawTo modal state
  const [selectedWithdrawCampaign, setSelectedWithdrawCampaign] = useState<string | null>(null);
  const [redirectRecipient, setRedirectRecipient] = useState<string>("");

  // Map of campaignAddress -> user's pledged wei
  const [pledgesMap, setPledgesMap] = useState<Record<string, bigint>>({});
  const [loadingPledges, setLoadingPledges] = useState<boolean>(false);

  // Query contributions for connected wallet across all campaigns
  const loadUserPledges = useCallback(async () => {
    await Promise.resolve();
    if (!wallet.address || campaigns.length === 0) {
      setPledgesMap({});
      return;
    }
    setLoadingPledges(true);
    const results: Record<string, bigint> = {};
    await Promise.all(
      campaigns.map(async (c) => {
        try {
          const amt = await getUserContribution(c.address, wallet.address!);
          if (amt > 0n) {
            results[c.address.toLowerCase()] = amt;
          }
        } catch {
          // ignore individual fetch errors
        }
      })
    );
    setPledgesMap(results);
    setLoadingPledges(false);
  }, [wallet.address, campaigns, getUserContribution]);

  useEffect(() => {
    loadUserPledges();
  }, [loadUserPledges]);

  // Creator metrics
  const myCreatedCampaigns = useMemo(() => {
    if (!wallet.address) return [];
    return campaigns.filter(
      (c) => c.creator.toLowerCase() === wallet.address?.toLowerCase()
    );
  }, [campaigns, wallet.address]);

  const creatorTotalRaisedWei = useMemo(() => {
    return myCreatedCampaigns.reduce((sum, c) => sum + c.totalRaised, 0n);
  }, [myCreatedCampaigns]);

  const creatorTotalBackers = useMemo(() => {
    return myCreatedCampaigns.reduce((sum, c) => sum + c.contributorCount, 0);
  }, [myCreatedCampaigns]);

  // Backer metrics
  const myBackedCampaigns = useMemo(() => {
    return campaigns.filter(
      (c) => (pledgesMap[c.address.toLowerCase()] || 0n) > 0n
    );
  }, [campaigns, pledgesMap]);

  const backerTotalContributedWei = useMemo(() => {
    return Object.values(pledgesMap).reduce((sum, amt) => sum + amt, 0n);
  }, [pledgesMap]);

  const claimableRefundTotalWei = useMemo(() => {
    return myBackedCampaigns
      .filter((c) => c.status === CampaignStatus.Failed || c.status === CampaignStatus.Cancelled)
      .reduce((sum, c) => sum + (pledgesMap[c.address.toLowerCase()] || 0n), 0n);
  }, [myBackedCampaigns, pledgesMap]);

  const handleWithdraw = async (campaignAddress: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await withdraw(campaignAddress);
      setSuccessMsg("Creator payout successfully withdrawn!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawTo = async () => {
    if (!selectedWithdrawCampaign || !ethers.isAddress(redirectRecipient)) {
      setErrorMsg("Please enter a valid recipient address.");
      return;
    }
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await withdrawTo(selectedWithdrawCampaign, redirectRecipient);
      setSuccessMsg(`Creator payout successfully sent to ${redirectRecipient}!`);
      setSelectedWithdrawCampaign(null);
      setRedirectRecipient("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "WithdrawTo failed.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async (campaignAddress: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await refund(campaignAddress);
      setSuccessMsg("100% full refund successfully reclaimed to your wallet!");
      await loadUserPledges();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refund failed.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="text-center py-24 space-y-4 max-w-md mx-auto">
        <Wallet className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Connect MetaMask, Rabby, or Coinbase Wallet to view campaigns you created, manage claimable
          payouts, or reclaim 100% code-guaranteed refunds.
        </p>
        <FancyButton variant="glow" size="md" onClick={connectWallet} className="mx-auto">
          Connect Wallet
        </FancyButton>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your created campaigns, monitor milestones, and reclaim full refunds.
          </p>
        </div>

        <Link href="/create">
          <FancyButton variant="glow" size="md" className="gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Launch New Escrow</span>
          </FancyButton>
        </Link>
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

      {/* Segmented Tabs: Creator vs Backer */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#0c1017] border border-white/[0.08] p-1 rounded-2xl w-full sm:w-auto inline-flex">
          <TabsTrigger
            value="creator"
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300 data-[state=active]:border data-[state=active]:border-emerald-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Creator View ({myCreatedCampaigns.length})</span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="backer"
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300 data-[state=active]:border data-[state=active]:border-emerald-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>Backer View ({myBackedCampaigns.length})</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Creator Content */}
        <TabsContent value="creator" className="space-y-6">
          {/* Creator High-Level Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Raised"
              value={parseFloat(ethers.formatEther(creatorTotalRaisedWei)).toFixed(2)}
              unit="ETH"
              delta={{ value: "On-Chain", trend: "up" }}
              icon={<Coins className="w-4 h-4 text-emerald-400" />}
            />
            <StatCard
              title="Campaigns Launched"
              value={myCreatedCampaigns.length}
              unit="Escrows"
              delta={{ value: "EIP-1167", trend: "neutral" }}
              icon={<Layers className="w-4 h-4 text-blue-400" />}
            />
            <StatCard
              title="Total Backers"
              value={creatorTotalBackers}
              unit="Supporters"
              delta={{ value: "Unique", trend: "up" }}
              icon={<Users className="w-4 h-4 text-cyan-400" />}
            />
            <StatCard
              title="Successful Campaigns"
              value={
                myCreatedCampaigns.filter(
                  (c) => c.status === CampaignStatus.Successful || c.status === CampaignStatus.Withdrawn
                ).length
              }
              unit="Funded"
              delta={{ value: "100%", trend: "up" }}
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            />
          </div>

          {/* Created Campaigns List */}
          {myCreatedCampaigns.length === 0 ? (
            <div className="text-center py-20 bg-[#0c1017] rounded-2xl border border-white/[0.08] p-8 space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No campaigns created yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Launch your first ETH crowdfunding campaign in minutes using our minimal proxy factory.
              </p>
              <Link href="/create">
                <FancyButton variant="glow" size="sm">
                  Launch Escrow Campaign
                </FancyButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myCreatedCampaigns.map((c) => {
                const percent =
                  c.goal > 0n ? Number((c.totalRaised * 10000n) / c.goal) / 100 : 0;
                const canWithdraw = c.status === CampaignStatus.Successful && !c.withdrawn;

                return (
                  <Card key={c.address} className="p-6 bg-[#0d121c] border border-white/[0.08] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="cyan" size="sm">
                            {c.category}
                          </Badge>
                          <Badge
                            variant={
                              c.status === CampaignStatus.Active
                                ? "success"
                                : c.status === CampaignStatus.Withdrawn || c.status === CampaignStatus.Successful
                                ? "cyan"
                                : "destructive"
                            }
                            size="sm"
                          >
                            {["ACTIVE", "SUCCESSFUL", "FAILED", "CANCELLED", "WITHDRAWN"][c.status]}
                          </Badge>
                        </div>
                        <Link href={`/campaign/${c.address}`}>
                          <h3 className="font-bold text-white text-lg hover:text-emerald-400 transition-colors">
                            {c.title}
                          </h3>
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        {canWithdraw && (
                          <>
                            <FancyButton
                              variant="glow"
                              size="sm"
                              onClick={() => handleWithdraw(c.address)}
                              disabled={isSubmitting}
                            >
                              Withdraw Payout
                            </FancyButton>
                            <FancyButton
                              variant="default"
                              size="sm"
                              onClick={() => setSelectedWithdrawCampaign(c.address)}
                              disabled={isSubmitting}
                            >
                              Withdraw To...
                            </FancyButton>
                          </>
                        )}
                        <Link href={`/campaign/${c.address}`}>
                          <FancyButton variant="default" size="sm" className="gap-1.5">
                            <span>View Escrow</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </FancyButton>
                        </Link>
                      </div>
                    </div>

                    <Meter
                      value={percent}
                      label={`${ethers.formatEther(c.totalRaised)} ETH raised / ${ethers.formatEther(c.goal)} ETH target (${percent.toFixed(1)}%)`}
                      size="sm"
                    />
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Backer Content */}
        <TabsContent value="backer" className="space-y-6">
          {/* Backer High-Level Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Contributed"
              value={parseFloat(ethers.formatEther(backerTotalContributedWei)).toFixed(3)}
              unit="ETH"
              delta={{ value: "Pledged", trend: "up" }}
              icon={<Coins className="w-4 h-4 text-emerald-400" />}
            />
            <StatCard
              title="Campaigns Backed"
              value={myBackedCampaigns.length}
              unit="Escrows"
              delta={{ value: "Supported", trend: "neutral" }}
              icon={<Wallet className="w-4 h-4 text-blue-400" />}
            />
            <StatCard
              title="Claimable Refunds"
              value={parseFloat(ethers.formatEther(claimableRefundTotalWei)).toFixed(3)}
              unit="ETH"
              delta={{ value: "100% Full", trend: claimableRefundTotalWei > 0n ? "up" : "neutral" }}
              icon={<RotateCcw className="w-4 h-4 text-amber-400" />}
            />
            <StatCard
              title="Refund Deductions"
              value="0"
              unit="%"
              delta={{ value: "Code Enforced", trend: "neutral" }}
              icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
            />
          </div>

          {/* Backed Campaigns List */}
          {loadingPledges ? (
            <div className="text-center py-16 bg-[#0c1017] rounded-2xl border border-white/[0.08] p-8 space-y-2">
              <Coins className="w-8 h-8 text-emerald-400 animate-pulse mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Querying your contribution receipts...</p>
            </div>
          ) : myBackedCampaigns.length === 0 ? (
            <div className="text-center py-20 bg-[#0c1017] rounded-2xl border border-white/[0.08] p-8 space-y-3">
              <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No campaigns backed yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Explore innovative projects and support creators with code-enforced refund guarantees.
              </p>
              <Link href="/">
                <FancyButton variant="glow" size="sm">
                  Explore Campaigns
                </FancyButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myBackedCampaigns.map((c) => {
                const userPledged = pledgesMap[c.address.toLowerCase()] || 0n;
                const canRefund =
                  (c.status === CampaignStatus.Failed || c.status === CampaignStatus.Cancelled) &&
                  userPledged > 0n;

                return (
                  <Card key={c.address} className="p-6 bg-[#0d121c] border border-white/[0.08] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="cyan" size="sm">
                            {c.category}
                          </Badge>
                          <Badge
                            variant={
                              c.status === CampaignStatus.Active
                                ? "success"
                                : c.status === CampaignStatus.Withdrawn || c.status === CampaignStatus.Successful
                                ? "cyan"
                                : "destructive"
                            }
                            size="sm"
                          >
                            {["ACTIVE", "SUCCESSFUL", "FAILED", "CANCELLED", "WITHDRAWN"][c.status]}
                          </Badge>
                        </div>
                        <Link href={`/campaign/${c.address}`}>
                          <h3 className="font-bold text-white text-lg hover:text-emerald-400 transition-colors">
                            {c.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Your Pledge: <strong className="text-emerald-400">{ethers.formatEther(userPledged)} ETH</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canRefund && (
                          <FancyButton
                            variant="glow"
                            size="sm"
                            onClick={() => handleRefund(c.address)}
                            disabled={isSubmitting}
                            className="gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Claim 100% Refund</span>
                          </FancyButton>
                        )}
                        <Link href={`/campaign/${c.address}`}>
                          <FancyButton variant="default" size="sm" className="gap-1.5">
                            <span>View Escrow</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </FancyButton>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* WithdrawTo Modal */}
      {selectedWithdrawCampaign && (
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
                onClick={() => setSelectedWithdrawCampaign(null)}
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
    </div>
  );
}
