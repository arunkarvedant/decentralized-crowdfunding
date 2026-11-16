"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import {
  Layers,
  Coins,
  Users,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import {
  FancyButton,
  Meter,
  StatCard,
  Badge,
  Card,
} from "@/components/ui/cubby-ui";

interface CreatorDashboardViewProps {
  onSelectCampaign: (address: string) => void;
  onLaunchNew: () => void;
}

export const CreatorDashboardView: React.FC<CreatorDashboardViewProps> = ({
  onSelectCampaign,
  onLaunchNew,
}) => {
  const { account, campaigns, withdraw, cancelCampaign, postUpdate } = useWeb3();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update modal state
  const [selectedCampaignForUpdate, setSelectedCampaignForUpdate] = useState<string | null>(null);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");

  // Filter campaigns created by current connected account
  const myCampaigns = campaigns.filter(
    (c) => c.creator.toLowerCase() === account.toLowerCase()
  );

  const totalRaised = myCampaigns
    .reduce((sum, c) => sum + parseFloat(c.totalRaised), 0)
    .toFixed(2);

  const totalBackers = myCampaigns.reduce((sum, c) => sum + c.contributorsCount, 0);

  const successfulCampaigns = myCampaigns.filter(
    (c) => c.status === "Successful" || c.status === "Withdrawn"
  );

  const handleWithdraw = async (campaignAddress: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);
      await withdraw(campaignAddress);
      setSuccessMsg("Withdrawal processed! Creator payout and platform fee split atomically.");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Withdrawal failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (campaignAddress: string) => {
    if (!confirm("Are you sure you want to cancel this campaign?")) return;
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      await cancelCampaign(campaignAddress);
      setSuccessMsg("Campaign cancelled.");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Cancellation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!selectedCampaignForUpdate || !updateTitle.trim() || !updateContent.trim()) return;
    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      await postUpdate(selectedCampaignForUpdate, updateTitle, updateContent);
      setSelectedCampaignForUpdate(null);
      setUpdateTitle("");
      setUpdateContent("");
      setSuccessMsg("Milestone update broadcasted on-chain!");
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || "Failed to post update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Creator Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your on-chain campaigns, track funding progress, post backer updates, and withdraw payouts.
          </p>
        </div>
        <FancyButton onClick={onLaunchNew} variant="primary" size="md">
          <PlusCircle className="w-4 h-4 mr-2" />
          <span>Launch New Escrow</span>
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

      {/* Overview Stat Cards with Cubby UI StatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total ETH Raised"
          value={totalRaised}
          unit="ETH"
          delta={{ value: "Escrow Volume", trend: "up" }}
          icon={<Coins className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Campaigns Created"
          value={myCampaigns.length}
          delta={{ value: "Active Escrows", trend: "neutral" }}
          icon={<Layers className="w-4 h-4 text-white" />}
        />
        <StatCard
          title="Total Backers"
          value={totalBackers}
          delta={{ value: "Pledges", trend: "up" }}
          icon={<Users className="w-4 h-4 text-cyan-400" />}
        />
        <StatCard
          title="Funded Campaigns"
          value={successfulCampaigns.length}
          delta={{ value: "100% Target Met", trend: "up" }}
          icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />}
        />
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Your Campaigns</span>
            <Badge variant="outline" size="sm">
              {myCampaigns.length}
            </Badge>
          </h2>
        </div>

        {myCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-[#0d1117]/60 rounded-2xl border border-white/[0.08] p-8 space-y-3">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No campaigns created under this wallet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You can switch to the &quot;Sarah (Creator)&quot; persona from the top navigation to view sample creator campaigns, or launch a new one now.
            </p>
            <div className="pt-2">
              <FancyButton onClick={onLaunchNew} variant="primary" size="sm">
                Launch First Campaign
              </FancyButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {myCampaigns.map((c) => {
              const raised = parseFloat(c.totalRaised);
              const goal = parseFloat(c.goal);
              const percent = Math.round((raised / goal) * 100);
              const isWithdrawable = c.status === "Successful" && !c.withdrawn;

              return (
                <Card
                  key={c.id}
                  elevation="raised"
                  className="p-5 sm:p-6 space-y-5 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" size="sm">
                          {c.category}
                        </Badge>
                        <span className="font-mono text-[10px] text-slate-400">
                          {c.address.slice(0, 10)}...
                        </span>
                        {c.status === "Active" && (
                          <Badge variant="success" size="sm" dot pulse>
                            ACTIVE
                          </Badge>
                        )}
                        {c.status === "Successful" && (
                          <Badge variant="cyan" size="sm">
                            FUNDED 100%
                          </Badge>
                        )}
                        {c.status === "Withdrawn" && (
                          <Badge variant="purple" size="sm">
                            WITHDRAWN
                          </Badge>
                        )}
                        {(c.status === "Failed" || c.status === "Cancelled") && (
                          <Badge variant="danger" size="sm">
                            CANCELLED
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

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <FancyButton
                        onClick={() => onSelectCampaign(c.address)}
                        variant="default"
                        size="sm"
                      >
                        View Page
                      </FancyButton>

                      <FancyButton
                        onClick={() => setSelectedCampaignForUpdate(c.address)}
                        variant="default"
                        size="sm"
                      >
                        + Post Update
                      </FancyButton>

                      {isWithdrawable && (
                        <FancyButton
                          onClick={() => handleWithdraw(c.address)}
                          disabled={isSubmitting}
                          variant="cyan"
                          size="sm"
                        >
                          Withdraw Payout ({(raised * 0.98).toFixed(2)} ETH)
                        </FancyButton>
                      )}

                      {c.status === "Active" && raised === 0 && (
                        <FancyButton
                          onClick={() => handleCancel(c.address)}
                          disabled={isSubmitting}
                          variant="danger"
                          size="sm"
                        >
                          Cancel Campaign
                        </FancyButton>
                      )}
                    </div>
                  </div>

                  {/* Segmented Meter Component */}
                  <Meter
                    value={percent}
                    label={`${c.totalRaised} ETH of ${c.goal} ETH target (${percent}%)`}
                    segments={24}
                    size="sm"
                  />

                  {/* Telemetry info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/[0.08] text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Backers Count:</span>
                      <p className="text-white font-bold mt-0.5">{c.contributorsCount} contributors</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Escrow Address:</span>
                      <p className="text-emerald-400 mt-0.5">{c.address.slice(0, 10)}...</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Milestone Posts:</span>
                      <p className="text-white font-bold mt-0.5">{c.updates.length} published</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Fee on Success:</span>
                      <p className="text-slate-300 mt-0.5">{c.feeBps / 100}% ({(raised * (c.feeBps / 10000)).toFixed(3)} ETH)</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Milestone Modal */}
      {selectedCampaignForUpdate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card elevation="overlay" className="max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white">Broadcast Milestone Update</h3>
            <p className="text-xs text-slate-400">
              Records an immutable milestone update on-chain for all campaign backers.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Prototype manufacturing completed"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content</label>
                <textarea
                  rows={4}
                  placeholder="Detail recent development progress, milestones hit, and upcoming deliverables..."
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
                onClick={() => setSelectedCampaignForUpdate(null)}
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
                Publish to Escrow
              </FancyButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
