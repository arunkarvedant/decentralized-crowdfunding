"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWeb3 } from "@/context/Web3Context";
import { CampaignStatus } from "@/types/crowdfunding";
import { ethers } from "ethers";
import {
  Clock,
  Coins,
  Users,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  Shield,
  Search,
} from "lucide-react";
import {
  MarchingBorder,
  FancyButton,
  Meter,
  SentenceFilters,
  Badge,
  Card,
  StatCard,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Avatar,
} from "@/components/ui/cubby-ui";

const CATEGORIES = [
  "All",
  "Technology",
  "Open Source",
  "Art & Film",
  "Community",
  "Gaming",
  "Other",
];

const STATUSES = ["All", "Active", "Successful", "Failed", "Cancelled"];

export const ExploreView: React.FC = () => {
  const router = useRouter();
  const { campaigns, loadingCampaigns } = useWeb3();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState<string>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Total ETH raised calculation with bigint summation
  const totalEthRaised = useMemo(() => {
    const totalWei = campaigns.reduce((acc, c) => acc + c.totalRaised, 0n);
    return parseFloat(ethers.formatEther(totalWei)).toFixed(2);
  }, [campaigns]);

  const activeCount = useMemo(() => {
    return campaigns.filter((c) => c.status === CampaignStatus.Active).length;
  }, [campaigns]);

  const successfulCount = useMemo(() => {
    return campaigns.filter(
      (c) => c.status === CampaignStatus.Successful || c.status === CampaignStatus.Withdrawn
    ).length;
  }, [campaigns]);

  // Filtered and sorted campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        const matchesCategory =
          selectedCategory === "All" || c.category === selectedCategory;

        let matchesStatus = true;
        if (selectedStatus === "Active") {
          matchesStatus = c.status === CampaignStatus.Active;
        } else if (selectedStatus === "Successful") {
          matchesStatus =
            c.status === CampaignStatus.Successful || c.status === CampaignStatus.Withdrawn;
        } else if (selectedStatus === "Failed") {
          matchesStatus = c.status === CampaignStatus.Failed;
        } else if (selectedStatus === "Cancelled") {
          matchesStatus = c.status === CampaignStatus.Cancelled;
        }

        const matchesSearch =
          !searchQuery.trim() ||
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.address.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "trending" || sortBy === "newest") {
          return Number(b.deadline - a.deadline);
        }
        if (sortBy === "progress") {
          const pctA = a.goal > 0n ? Number((a.totalRaised * 10000n) / a.goal) : 0;
          const pctB = b.goal > 0n ? Number((b.totalRaised * 10000n) / b.goal) : 0;
          return pctB - pctA;
        }
        if (sortBy === "endingSoon") {
          return Number(a.deadline - b.deadline);
        }
        return 0;
      });
  }, [campaigns, selectedCategory, selectedStatus, searchQuery, sortBy]);

  const formatRemainingTime = (deadlineSec: bigint) => {
    const diff = Number(deadlineSec) - currentTime;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m left`;
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.Active:
        return (
          <Badge variant="success" size="sm" dot pulse>
            ACTIVE
          </Badge>
        );
      case CampaignStatus.Successful:
      case CampaignStatus.Withdrawn:
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

  const featuredCampaign = useMemo(() => {
    return campaigns.find((c) => c.status === CampaignStatus.Active) || campaigns[0] || null;
  }, [campaigns]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0c1017] via-[#090d14] to-[#07090e] border border-white/[0.08] p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Autonomous Smart Contract Escrow</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Decentralized Crowdfunding.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Zero Custody.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Launch ETH-denominated campaigns with code-enforced all-or-nothing guarantees.
            Creators withdraw only when the target is reached; backers reclaim 100% full
            refunds autonomously if it falls short.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/create">
              <FancyButton variant="glow" size="lg" className="gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Launch Escrow Campaign</span>
                <ArrowRight className="w-4 h-4" />
              </FancyButton>
            </Link>

            <div className="relative flex-1 min-w-[240px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.08]">
            <StatCard
              title="Total ETH Raised"
              value={totalEthRaised}
              unit="ETH"
              delta={{ value: "On-chain", trend: "up" }}
              icon={<Coins className="w-4 h-4 text-emerald-400" />}
            />
            <StatCard
              title="Active Escrows"
              value={activeCount}
              unit="Live"
              delta={{ value: "All-or-Nothing", trend: "neutral" }}
              icon={<Clock className="w-4 h-4 text-blue-400" />}
            />
            <StatCard
              title="Funded Campaigns"
              value={successfulCount}
              unit="100%"
              delta={{ value: "Guaranteed", trend: "up" }}
              icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
            />
            <StatCard
              title="Refund Guarantee"
              value="100"
              unit="%"
              delta={{ value: "Zero deductions", trend: "neutral" }}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
            />
          </div>
        </div>
      </section>

      {/* Featured Campaign Highlight with MarchingBorder */}
      {featuredCampaign && (
        <section className="relative rounded-2xl bg-[#0d121c] border border-white/[0.08] p-6 sm:p-7 shadow-xl overflow-hidden group">
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
                  <Badge variant="outline" size="sm">
                    FEATURED ESCROW
                  </Badge>
                  <Badge variant="success" size="sm">
                    {featuredCampaign.category}
                  </Badge>
                </div>
                {getStatusBadge(featuredCampaign.status)}
              </div>

              <h2
                onClick={() => router.push(`/campaign/${featuredCampaign.address}`)}
                className="text-xl font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {featuredCampaign.title}
              </h2>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {featuredCampaign.summary}
              </p>

              {/* Segmented Meter Component */}
              <div className="pt-2">
                <Meter
                  value={
                    featuredCampaign.goal > 0n
                      ? Number((featuredCampaign.totalRaised * 10000n) / featuredCampaign.goal) / 100
                      : 0
                  }
                  label={`${ethers.formatEther(featuredCampaign.totalRaised)} ETH raised of ${ethers.formatEther(featuredCampaign.goal)} ETH target`}
                  segments={28}
                  size="md"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Avatar address={featuredCampaign.creator} size="sm" />
                    <span>{featuredCampaign.creator.slice(0, 6)}...</span>
                  </div>
                  <span>•</span>
                  <span>{featuredCampaign.contributorCount} backers</span>
                  <span>•</span>
                  <span>{formatRemainingTime(featuredCampaign.deadline)}</span>
                </div>

                <Link href={`/campaign/${featuredCampaign.address}`}>
                  <FancyButton variant="glow" size="sm" className="gap-1.5">
                    <span>View Campaign</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </FancyButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Campaign Catalog Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Browse Escrows</h2>
            <p className="text-xs text-slate-400">
              Verified on-chain minimal proxy clones deployed via CampaignFactory.
            </p>
          </div>

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
        {loadingCampaigns ? (
          <div className="text-center py-20 bg-[#0c1017] rounded-2xl border border-white/[0.08] p-8 space-y-3">
            <Coins className="w-10 h-10 text-emerald-400 animate-pulse mx-auto" />
            <h3 className="text-base font-bold text-white">Loading On-Chain Campaigns...</h3>
            <p className="text-xs text-slate-400">Fetching live contract details from RPC provider.</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
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
                setSearchQuery("");
              }}
            >
              Reset Filters
            </FancyButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((c) => {
              const percent =
                c.goal > 0n ? Number((c.totalRaised * 10000n) / c.goal) / 100 : 0;
              const isEndingSoon =
                c.status === CampaignStatus.Active &&
                Number(c.deadline) - currentTime < 86400 * 3 &&
                Number(c.deadline) - currentTime > 0;

              return (
                <Card
                  key={c.address}
                  interactive
                  onClick={() => router.push(`/campaign/${c.address}`)}
                  className="group relative flex flex-col overflow-hidden bg-[#0d121c] hover:bg-[#111724]"
                >
                  {isEndingSoon && (
                    <MarchingBorder
                      strokeWidth={1.5}
                      dash={1}
                      gap={0.8}
                      duration={1.5}
                      className="text-amber-400/60"
                    />
                  )}

                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="default" size="sm">
                        {c.category}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">{getStatusBadge(c.status)}</div>
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Avatar address={c.creator} size="sm" />
                        <span className="font-mono text-[11px] truncate">
                          {c.creator.slice(0, 6)}...{c.creator.slice(-4)}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {c.summary}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                      <Meter
                        value={percent}
                        label={`${ethers.formatEther(c.totalRaised)} ETH / ${ethers.formatEther(c.goal)} ETH`}
                        segments={20}
                        size="sm"
                      />

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.contributorCount} backers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatRemainingTime(c.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Accordion: How Trustless Non-Custodial Escrow Works */}
      <section className="rounded-3xl bg-[#0b0f16] border border-white/[0.08] p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Trustless Security & Smart Contract Architecture</h2>
            </div>
            <p className="text-xs text-slate-400">
              Clear code guarantees on how EIP-1167 minimal proxy clones protect both backers and creators.
            </p>
          </div>
          <Badge variant="cyan" size="sm">
            Audited Logic
          </Badge>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="escrow">
            <AccordionTrigger>
              <div className="flex items-center space-x-2.5 text-left">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-200">
                  How does the All-or-Nothing Escrow guarantee safety?
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you pledge ETH to a campaign, the funds are transferred directly to that campaign&apos;s
                autonomous smart contract instance. The Crowdr platform backend never touches or custodies
                your funds. If the campaign reaches 100% of its goal by the deadline, the creator may withdraw
                the payout. If the deadline passes without hitting the target, the contract automatically opens
                100% full refund claims for every backer.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="clones">
            <AccordionTrigger>
              <div className="flex items-center space-x-2.5 text-left">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Why EIP-1167 Minimal Proxy Clones?
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deploying a full smart contract for each campaign costs millions of gas. By deploying an
                EIP-1167 minimal proxy clone, deployment gas is reduced by over 80% (~348k gas), while giving
                each campaign its own isolated contract address, isolated storage, and separate balance ledger.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="refunds">
            <AccordionTrigger>
              <div className="flex items-center space-x-2.5 text-left">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Are refunds immediate and without platform fees?
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes. The platform fee is strictly 0% on failed or cancelled campaigns. Contributors call
                `refund()` directly on the contract to receive 100% of their contributed wei. Even if the platform
                is paused or offline, the contract logic continues to process refunds autonomously.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
};
