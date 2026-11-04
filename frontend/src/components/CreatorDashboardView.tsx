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
} from "lucide-react";

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
          <h1 className="text-3xl font-extrabold text-white">Creator Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your on-chain campaigns, track funding progress, post backer updates, and withdraw payouts.
          </p>
        </div>
        <button
          onClick={onLaunchNew}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch New Campaign</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400">Total ETH Raised</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{totalRaised} ETH</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400">Campaigns Created</p>
          <p className="text-2xl font-bold text-white">{myCampaigns.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400">Total Backers</p>
          <p className="text-2xl font-bold text-cyan-400">{totalBackers}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400">Successful Campaigns</p>
          <p className="text-2xl font-bold text-purple-400">{successfulCampaigns.length}</p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Your Campaigns</h2>

        {myCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 space-y-3">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No campaigns created under this wallet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You can switch to the &quot;Sarah (Creator)&quot; persona from the top navigation to view sample creator campaigns, or launch a new one now.
            </p>
            <button
              onClick={onLaunchNew}
              className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Launch First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myCampaigns.map((c) => {
              const raised = parseFloat(c.totalRaised);
              const goal = parseFloat(c.goal);
              const percent = Math.round((raised / goal) * 100);
              const isWithdrawable = c.status === "Successful" && !c.withdrawn;

              return (
                <div
                  key={c.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {c.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {c.address.slice(0, 10)}...
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : c.status === "Successful"
                              ? "bg-cyan-500/20 text-cyan-300"
                              : c.status === "Withdrawn"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {c.status}
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
                      <button
                        onClick={() => onSelectCampaign(c.address)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      >
                        View Page
                      </button>

                      <button
                        onClick={() => setSelectedCampaignForUpdate(c.address)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium transition-colors"
                      >
                        + Post Update
                      </button>

                      {isWithdrawable && (
                        <button
                          onClick={() => handleWithdraw(c.address)}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition-all"
                        >
                          Withdraw Payout ({(raised * 0.98).toFixed(2)} ETH)
                        </button>
                      )}

                      {c.status === "Active" && raised === 0 && (
                        <button
                          onClick={() => handleCancel(c.address)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500">Raised / Goal:</span>
                      <p className="font-mono font-bold text-white">
                        {c.totalRaised} / {c.goal} ETH ({percent}%)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Backers:</span>
                      <p className="font-bold text-white">{c.contributorsCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Milestone Updates:</span>
                      <p className="font-bold text-white">{c.updates.length}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Platform Fee:</span>
                      <p className="font-mono text-white">{c.feeBps / 100}% on success</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Milestone Update Modal */}
      {selectedCampaignForUpdate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content (Markdown)</label>
                <textarea
                  rows={4}
                  placeholder="Describe recent milestones, deliverables, and next steps..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedCampaignForUpdate(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePostUpdate}
                disabled={isSubmitting || !updateTitle || !updateContent}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "Broadcasting..." : "Publish On-Chain"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
