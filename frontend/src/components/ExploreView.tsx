"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Campaign, CampaignStatus } from "@/types/crowdfunding";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  Users,
  Shield,
  ArrowRight,
  TrendingUp,
  Filter,
} from "lucide-react";

interface ExploreViewProps {
  onSelectCampaign: (address: string) => void;
  onLaunchClick: () => void;
}

const CATEGORIES = ["All", "Technology", "Open Source", "Art & Film", "Community", "Gaming"];
const STATUSES = ["All", "Active", "Successful", "Failed"];

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectCampaign, onLaunchClick }) => {
  const { campaigns } = useWeb3();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState<"trending" | "progress" | "endingSoon" | "newest">("trending");

  // Calculate high-level platform stats
  const totalEthRaised = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + parseFloat(c.totalRaised), 0).toFixed(1);
  }, [campaigns]);

  const activeCount = useMemo(() => {
    return campaigns.filter((c) => c.status === "Active").length;
  }, [campaigns]);

  const successfulCount = useMemo(() => {
    return campaigns.filter((c) => c.status === "Successful" || c.status === "Withdrawn").length;
  }, [campaigns]);

  // Filtered and sorted campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        const matchesQuery =
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.creator.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === "All" || c.category === selectedCategory;

        const matchesStatus =
          selectedStatus === "All" ||
          (selectedStatus === "Active" && c.status === "Active") ||
          (selectedStatus === "Successful" && (c.status === "Successful" || c.status === "Withdrawn")) ||
          (selectedStatus === "Failed" && (c.status === "Failed" || c.status === "Cancelled"));

        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "trending" || sortBy === "newest") {
          return b.createdAt - a.createdAt;
        }
        if (sortBy === "progress") {
          const pctA = (parseFloat(a.totalRaised) / parseFloat(a.goal)) * 100;
          const pctB = (parseFloat(b.totalRaised) / parseFloat(b.goal)) * 100;
          return pctB - pctA;
        }
        if (sortBy === "endingSoon") {
          return a.deadline - b.deadline;
        }
        return 0;
      });
  }, [campaigns, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatRemainingTime = (deadlineSec: number) => {
    if (!currentTime) return "Loading...";
    const diff = deadlineSec - currentTime;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m left`;
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Active
          </span>
        );
      case "Successful":
      case "Withdrawn":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {status === "Withdrawn" ? "Funded & Paid" : "Funded 100%"}
          </span>
        );
      case "Failed":
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status === "Cancelled" ? "Cancelled" : "Failed · Refund Ready"}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Non-Custodial · All-or-Nothing Smart Contracts</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Fund projects with <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              guaranteed on-chain refunds.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Direct peer-to-peer ETH crowdfunding where code holds custody. If a campaign hits its goal before the
            deadline, the creator receives the funds. If not, every contributor reclaims 100% of their contribution.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onLaunchClick}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start a Campaign</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#campaign-grid"
              className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-all"
            >
              <span>Explore Projects</span>
            </a>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
            <div>
              <p className="text-xs text-slate-400">Total Raised</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{totalEthRaised} ETH</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Campaigns</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{activeCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Funded Projects</p>
              <p className="text-xl sm:text-2xl font-bold text-cyan-400">{successfulCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Platform Fee</p>
              <p className="text-xl sm:text-2xl font-bold text-white">2.0% <span className="text-xs text-slate-400 font-normal">(on success only)</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery Filters and Search */}
      <section id="campaign-grid" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns by title, keywords or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Sorting & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedStatus === status
                      ? "bg-slate-800 text-emerald-400 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "trending" | "progress" | "endingSoon" | "newest")}
              aria-label="Sort campaigns"
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="trending">Trending / Featured</option>
              <option value="progress">% Reached (Highest)</option>
              <option value="endingSoon">Ending Soonest</option>
              <option value="newest">Recently Launched</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No campaigns found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or filter to discover projects.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setSelectedStatus("All");
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-emerald-400 hover:bg-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((c) => {
              const raised = parseFloat(c.totalRaised);
              const goal = parseFloat(c.goal);
              const percent = Math.min(Math.round((raised / goal) * 100), 100);
              const actualPercent = Math.round((raised / goal) * 100);

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCampaign(c.address)}
                  className="group flex flex-col bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
                >
                  {/* Cover Image & Category Badge */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700/50">
                        {c.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">{getStatusBadge(c.status)}</div>
                  </div>

                  {/* Body Info */}
                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {c.summary}
                      </p>
                    </div>

                    {/* Progress Bar & Goal */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="flex justify-between items-baseline text-xs">
                        <div>
                          <span className="font-bold font-mono text-white text-sm">{c.totalRaised} ETH</span>
                          <span className="text-slate-500 ml-1">raised of {c.goal} ETH</span>
                        </div>
                        <span
                          className={`font-bold font-mono ${
                            actualPercent >= 100 ? "text-emerald-400" : "text-slate-300"
                          }`}
                        >
                          {actualPercent}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            actualPercent >= 100
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Footer: Backers & Time */}
                      <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.contributorsCount} backers</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatRemainingTime(c.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
