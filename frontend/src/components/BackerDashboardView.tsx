"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import {
  Wallet,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Layers,
} from "lucide-react";
import {
  FancyButton,
  MarchingBorder,
  StatCard,
  Badge,
  Card,
} from "@/components/ui/cubby-ui";

interface BackerDashboardViewProps {
  onSelectCampaign: (address: string) => void;
  onExplore: () => void;
}

export const BackerDashboardView: React.FC<BackerDashboardViewProps> = ({
  onSelectCampaign,
  onExplore,
}) => {
  const { account, campaigns, claimRefund } = useWeb3();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Find all campaigns backed by the connected wallet
  const backedCampaigns = campaigns
    .map((c) => {
      const myContributions = c.contributors.filter(
        (ct) => ct.address.toLowerCase() === account.toLowerCase()
      );
      const myTotal = myContributions.reduce((sum, ct) => sum + parseFloat(ct.amount), 0);
      return {
        ...c,
        myTotalContributed: myTotal,
        myReceipts: myContributions,
      };
    })
    .filter((c) => c.myTotalContributed > 0);

  const totalContributedEth = backedCampaigns
    .reduce((sum, c) => sum + c.myTotalContributed, 0)
    .toFixed(3);

  // Calculate claimable refund sum
  const claimableRefundTotal = backedCampaigns
    .filter((c) => c.status === "Failed" || c.status === "Cancelled")
    .reduce((sum, c) => sum + c.myTotalContributed, 0)
    .toFixed(3);

  const handleClaimRefund = async (campaignAddress: string, amount: number) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await claimRefund(campaignAddress);
      setSuccessMsg(`100% full refund of ${amount.toFixed(3)} ETH claimed successfully! Zero fees deducted.`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to claim refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Contributor Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your on-chain pledges, view transaction receipts, and reclaim code-guaranteed refunds.
          </p>
        </div>
        <FancyButton onClick={onExplore} variant="default" size="md">
          <span>Explore More Campaigns</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </FancyButton>
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

      {/* Top Stat Cards with Cubby UI StatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Contributed"
          value={totalContributedEth}
          unit="ETH"
          delta={{ value: "On-Chain Escrows", trend: "neutral" }}
          icon={<Coins className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Campaigns Backed"
          value={backedCampaigns.length}
          delta={{ value: "Portfolio", trend: "neutral" }}
          icon={<Layers className="w-4 h-4 text-white" />}
        />
        <StatCard
          title="Funded Projects"
          value={backedCampaigns.filter((c) => c.status === "Successful" || c.status === "Withdrawn").length}
          delta={{ value: "Payout Ready", trend: "up" }}
          icon={<CheckCircle2 className="w-4 h-4 text-cyan-400" />}
        />
        <StatCard
          title="Claimable Refunds"
          value={claimableRefundTotal}
          unit="ETH"
          delta={{ value: "Zero Fees Deducted", trend: "neutral" }}
          icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {/* Backed Campaigns Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Your Backed Campaigns</span>
            <Badge variant="outline" size="sm">
              {backedCampaigns.length}
            </Badge>
          </h2>
        </div>

        {backedCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-[#0d1117]/60 rounded-2xl border border-white/[0.08] p-8 space-y-3">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No active contributions for this wallet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Switch to the &quot;Alex (Backer)&quot; persona from the top navigation to view sample backed campaigns, or explore active projects to back one.
            </p>
            <div className="pt-2">
              <FancyButton onClick={onExplore} variant="primary" size="sm">
                Browse Active Projects
              </FancyButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {backedCampaigns.map((c) => {
              const isRefundable =
                (c.status === "Failed" || c.status === "Cancelled") && c.myTotalContributed > 0;

              return (
                <Card
                  key={c.id}
                  elevation="raised"
                  className="p-5 sm:p-6 space-y-4 relative overflow-hidden"
                >
                  {isRefundable && (
                    <MarchingBorder
                      strokeWidth={1.5}
                      dash={1}
                      gap={0.8}
                      duration={1.5}
                      className="text-amber-400/60"
                    />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" size="sm">
                          {c.category}
                        </Badge>
                        {c.status === "Active" && (
                          <Badge variant="success" size="sm" dot pulse>
                            ACTIVE
                          </Badge>
                        )}
                        {(c.status === "Successful" || c.status === "Withdrawn") && (
                          <Badge variant="cyan" size="sm">
                            FUNDED 100%
                          </Badge>
                        )}
                        {(c.status === "Failed" || c.status === "Cancelled") && (
                          <Badge variant="danger" size="sm">
                            REFUND READY
                          </Badge>
                        )}
                      </div>
                      <h3
                        onClick={() => onSelectCampaign(c.address)}
                        className="font-bold text-white text-base hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {c.title}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400">Your Pledge:</span>
                        <p className="font-mono font-bold text-emerald-400 text-base">
                          {c.myTotalContributed.toFixed(3)} ETH
                        </p>
                      </div>

                      {isRefundable ? (
                        <FancyButton
                          onClick={() => handleClaimRefund(c.address, c.myTotalContributed)}
                          disabled={isSubmitting}
                          variant="primary"
                          size="md"
                        >
                          <ShieldCheck className="w-4 h-4 mr-1.5" />
                          <span>Claim 100% Refund</span>
                        </FancyButton>
                      ) : (
                        <FancyButton
                          onClick={() => onSelectCampaign(c.address)}
                          variant="default"
                          size="sm"
                        >
                          View Details
                        </FancyButton>
                      )}
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-white/[0.08] text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Campaign Progress:</span>
                      <p className="font-mono text-white font-medium mt-0.5">
                        {c.totalRaised} / {c.goal} ETH
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Contract Clone:</span>
                      <p className="font-mono text-emerald-400 mt-0.5">{c.address.slice(0, 10)}...{c.address.slice(-6)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Escrow State:</span>
                      <p className="text-emerald-400 font-medium flex items-center space-x-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                        <span>Verified on-chain</span>
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
