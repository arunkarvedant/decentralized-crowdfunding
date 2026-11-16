"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Campaign, CampaignStatus } from "@/types/crowdfunding";
import {
  Layers,
  Coins,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileText,
  DollarSign,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { FancyButton, MarchingBorder, Meter } from "@/components/ui/cubby-ui";

interface CreatorDashboardViewProps {
  onSelectCampaign: (address: string) => void;
  onLaunchNew: () => void;
}

export const CreatorDashboardView: React.FC<CreatorDashboardViewProps> = ({
  onSelectCampaign,
  onLaunchNew,
}) => {
  const { account, campaigns, withdraw, cancelCampaign, postUpdate } = useWeb3();

  const [activeTab, setActiveTab] = useState<"all" | "active" | "successful" | "ended">("all");
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
          <span>Launch New Campaign</span>
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-1 shadow-lg">
          <p className="text-xs text-slate-400">Total ETH Raised</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{totalRaised} ETH</p>
        </div>
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-1 shadow-lg">
          <p className="text-xs text-slate-400">Campaigns Created</p>
          <p className="text-2xl font-bold text-white font-mono">{myCampaigns.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-1 shadow-lg">
          <p className="text-xs text-slate-400">Total Backers</p>
          <p className="text-2xl font-bold text-cyan-400 font-mono">{totalBackers}</p>
        </div>
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-white/[0.08] space-y-1 shadow-lg">
          <p className="text-xs text-slate-400">Successful Campaigns</p>
          <p className="text-2xl font-bold text-purple-400 font-mono">{successfulCampaigns.length}</p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <span>Your Campaigns</span>
          <span className="text-xs font-mono text-slate-500">({myCampaigns.length})</span>
        </h2>

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

              const cardContent = (
                <div className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#080a0e] text-slate-300 border border-white/5">
                          {c.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {c.address.slice(0, 10)}...
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : c.status === "Successful"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : c.status === "Withdrawn"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          ● {c.status}
                        </span>
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
                          Cancel
                        </FancyButton>
                      )}
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1.5">
                    <Meter
                      value={raised}
                      max={goal}
                      label={`Progress: ${percent}% funded`}
                      size="sm"
                      segments={12}
                    />
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/[0.08] text-xs">
                    <div>
                      <span className="text-slate-500">Raised / Goal:</span>
                      <p className="font-mono font-bold text-white">
                        {c.totalRaised} / {c.goal} ETH
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Backers:</span>
                      <p className="font-bold text-white font-mono">{c.contributorsCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Milestones:</span>
                      <p className="font-bold text-white font-mono">{c.updates.length}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Platform Fee:</span>
                      <p className="font-mono text-emerald-400">{c.feeBps / 100}% on success</p>
                    </div>
                  </div>
                </div>
              );

              return isWithdrawable ? (
                <MarchingBorder key={c.id} borderRadius={16} strokeColor="#06b6d4" duration={6}>
                  {cardContent}
                </MarchingBorder>
              ) : (
                <div key={c.id}>{cardContent}</div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Milestone Update Modal */}
      {selectedCampaignForUpdate && (
        <div className="fixed inset-0 bg-[#080a0e]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Post Creator Milestone Update</span>
            </h3>
            <p className="text-xs text-slate-400">
              Broadcasts an immutable update to all project backers on-chain.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Smart contracts audited & verified"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080a0e] border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Content (Markdown)</label>
                <textarea
                  rows={4}
                  placeholder="Describe recent milestones, deliverables, and next steps..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080a0e] border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <FancyButton
                onClick={() => setSelectedCampaignForUpdate(null)}
                variant="default"
                size="sm"
              >
                Cancel
              </FancyButton>
              <FancyButton
                onClick={handlePostUpdate}
                disabled={isSubmitting || !updateTitle || !updateContent}
                variant="primary"
                size="sm"
              >
                {isSubmitting ? "Broadcasting..." : "Publish On-Chain"}
              </FancyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
