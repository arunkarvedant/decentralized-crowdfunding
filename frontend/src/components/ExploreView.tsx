"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { Campaign, CampaignStatus } from "@/types/crowdfunding";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  Layers,
  Flame,
} from "lucide-react";
import { MarchingBorder } from "@/components/ui/cubby-ui/marching-border";
import { FancyButton } from "@/components/ui/cubby-ui/fancy-button";
import { Meter } from "@/components/ui/cubby-ui/meter";
import { SentenceFilters } from "@/components/ui/cubby-ui/filters";
import { Kbd } from "@/components/ui/cubby-ui/kbd";

interface ExploreViewProps {
  onSelectCampaign: (address: string) => void;
  onLaunchClick: () => void;
  onOpenCommandMenu?: () => void;
}

const CATEGORIES = ["All", "Technology", "Open Source", "Art & Film", "Community", "Gaming"];
const STATUSES = ["All", "Active", "Successful", "Failed"];

export const ExploreView: React.FC<ExploreViewProps> = ({
  onSelectCampaign,
  onLaunchClick,
  onOpenCommandMenu,
}) => {
  const { campaigns } = useWeb3();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState<string>("trending");
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
        const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
        const matchesStatus =
          selectedStatus === "All" ||
          (selectedStatus === "Active" && c.status === "Active") ||
          (selectedStatus === "Successful" && (c.status === "Successful" || c.status === "Withdrawn")) ||
          (selectedStatus === "Failed" && (c.status === "Failed" || c.status === "Cancelled"));
        return matchesCategory && matchesStatus;
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
  }, [campaigns, selectedCategory, selectedStatus, sortBy]);

  const formatRemainingTime = (deadlineSec: number) => {
    if (!currentTime) return "Calculating...";
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            ACTIVE
          </span>
        );
      case "Successful":
      case "Withdrawn":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {status === "Withdrawn" ? "PAID OUT" : "FUNDED 100%"}
          </span>
        );
      case "Failed":
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            REFUND READY
          </span>
        );
      default:
        return null;
    }
  };

  const featuredCampaign = campaigns.find((c) => c.status === "Active");

  return (
    <div className="space-y-10 pb-20">
      {/* Precision Hero Section */}
      <section className="relative rounded-3xl bg-[#0c1017] border border-white/[0.08] p-8 sm:p-10 shadow-2xl overflow-hidden">
        {/* Subtle accent light */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-emerald-500/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Non-Custodial Ethereum Crowdfunding</span>
            <Kbd size="xs">EIP-1167</Kbd>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Peer-to-peer capital <br className="hidden sm:inline" />
            with <span className="text-emerald-400">code-guaranteed</span> full refunds.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Funds are locked in immutable smart contract clones. If a campaign hits its goal before the
            deadline, the creator withdraws the funds. If not, every backer can instantly reclaim 100% of their ETH.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <FancyButton
              variant="primary"
              size="lg"
              onClick={onLaunchClick}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start a Campaign
            </FancyButton>

            <FancyButton
              variant="default"
              size="lg"
              onClick={onOpenCommandMenu}
              leftIcon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            >
              Command Palette
            </FancyButton>
          </div>

          {/* Precision Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.08]">
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-slate-400">Total Volume Raised</span>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{totalEthRaised} ETH</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-slate-400">Active Escrows</span>
              <p className="text-xl sm:text-2xl font-black font-mono text-white">{activeCount}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-slate-400">Funded Projects</span>
              <p className="text-xl sm:text-2xl font-black font-mono text-cyan-400">{successfulCount}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-slate-400">Platform Fee</span>
              <p className="text-xl sm:text-2xl font-black font-mono text-white">
                2.0% <span className="text-xs font-normal text-slate-400 font-sans">(on success only)</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaign Highlight with Cubby UI MarchingBorder */}
      {featuredCampaign && (
        <section className="relative rounded-2xl bg-[#0d1118] border border-white/[0.08] p-6 sm:p-7 shadow-xl overflow-hidden group">
          {/* Animated Marching Ants Border on Live Spotlight */}
          <MarchingBorder
            strokeWidth={1.5}
            dash={1.5}
            gap={1}
            duration={1.2}
            className="text-emerald-500/50"
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/3 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/[0.08]">
              <img
                src={featuredCampaign.coverImage}
                alt={featuredCampaign.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-slate-300">
                    FEATURED ESCROW
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
                    {featuredCampaign.category}
                  </span>
                </div>
                {getStatusBadge(featuredCampaign.status)}
              </div>

              <h2
                onClick={() => onSelectCampaign(featuredCampaign.address)}
                className="text-xl font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {featuredCampaign.title}
              </h2>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {featuredCampaign.summary}
              </p>

              {/* Segmented Meter */}
              <div className="pt-2">
                <Meter
                  value={(parseFloat(featuredCampaign.totalRaised) / parseFloat(featuredCampaign.goal)) * 100}
                  label={`${featuredCampaign.totalRaised} ETH raised of ${featuredCampaign.goal} ETH target`}
                  segments={28}
                  size="md"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                  <span>{featuredCampaign.contributorsCount} backers</span>
                  <span>•</span>
                  <span>{formatRemainingTime(featuredCampaign.deadline)}</span>
                </div>

                <FancyButton
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectCampaign(featuredCampaign.address)}
                >
                  View Escrow
                </FancyButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cubby UI Sentence Filter Bar */}
      <section className="space-y-6">
        <div className="p-4 rounded-2xl bg-[#0c1017] border border-white/[0.08] shadow-sm">
          <SentenceFilters
            category={selectedCategory}
            setCategory={setSelectedCategory}
            status={selectedStatus}
            setStatus={setSelectedStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            categories={CATEGORIES}
            statuses={STATUSES}
          />
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-20 bg-[#0c1017] rounded-2xl border border-white/[0.08] p-8 space-y-3">
            <Coins className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No campaigns match these filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Reset your category or status filters to view all active campaigns.
            </p>
            <FancyButton
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedCategory("All");
                setSelectedStatus("All");
              }}
            >
              Reset Filters
            </FancyButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((c) => {
              const raised = parseFloat(c.totalRaised);
              const goal = parseFloat(c.goal);
              const percent = (raised / goal) * 100;
              const isEndingSoon = c.status === "Active" && c.deadline - currentTime < 86400 * 3;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCampaign(c.address)}
                  className="group relative flex flex-col bg-[#0d1118] hover:bg-[#111620] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer"
                >
                  {/* Subtle Marching Border on ending soon or 90%+ campaigns */}
                  {isEndingSoon && (
                    <MarchingBorder
                      strokeWidth={1.5}
                      dash={1}
                      gap={0.8}
                      duration={1.5}
                      className="text-amber-400/60"
                    />
                  )}

                  {/* Image container */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-white/[0.1]">
                        {c.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">{getStatusBadge(c.status)}</div>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {c.summary}
                      </p>
                    </div>

                    {/* Segmented Meter Component */}
                    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                      <Meter
                        value={percent}
                        label={`${c.totalRaised} ETH / ${c.goal} ETH`}
                        segments={20}
                        size="sm"
                      />

                      {/* Card Footer */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.contributorsCount} backers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
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
