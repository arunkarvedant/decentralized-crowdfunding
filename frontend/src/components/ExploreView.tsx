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
  ShieldCheck,
  Code,
  Lock,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import {
  MarchingBorder,
  FancyButton,
  Meter,
  SentenceFilters,
  Kbd,
  Badge,
  Card,
  StatCard,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Avatar,
  Tooltip,
} from "@/components/ui/cubby-ui";

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
          <Badge variant="success" size="sm" dot pulse>
            ACTIVE
          </Badge>
        );
      case "Successful":
      case "Withdrawn":
        return (
          <Badge variant="cyan" size="sm">
            {status === "Withdrawn" ? "PAID OUT" : "FUNDED 100%"}
          </Badge>
        );
      case "Failed":
      case "Cancelled":
        return (
          <Badge variant="danger" size="sm">
            REFUND READY
          </Badge>
        );
      default:
        return null;
    }
  };

  const featuredCampaign = campaigns.find((c) => c.status === "Active");

  return (
    <div className="space-y-10 pb-20">
      {/* Precision Hero Section with Cubby UI StatCards */}
      <section className="relative rounded-3xl bg-[#0b0f16] border border-white/[0.08] p-7 sm:p-10 shadow-2xl overflow-hidden">
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
            Funds are locked in immutable smart contract clones. If a campaign hits its target before the
            deadline, the creator withdraws the funds. If not, every backer can instantly reclaim 100% of their ETH.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <FancyButton
              variant="primary"
              size="lg"
              onClick={onLaunchClick}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start an Escrow Campaign
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

          {/* Precision Cubby UI StatCard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4">
            <StatCard
              title="Total Volume Raised"
              value={totalEthRaised}
              unit="ETH"
              delta={{ value: "+18.4%", trend: "up", label: "vs last cycle" }}
              icon={<Coins className="w-4 h-4 text-emerald-400" />}
            />
            <StatCard
              title="Active Escrows"
              value={activeCount}
              delta={{ value: "On-Chain", trend: "neutral" }}
              icon={<Layers className="w-4 h-4 text-white" />}
            />
            <StatCard
              title="Fully Funded Projects"
              value={successfulCount}
              unit="100%"
              delta={{ value: "Autonomous", trend: "up" }}
              icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
            />
            <StatCard
              title="Escrow Platform Fee"
              value="2.0"
              unit="%"
              delta={{ value: "On Success Only", trend: "neutral" }}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
            />
          </div>
        </div>
      </section>

      {/* Featured Campaign Highlight with Cubby UI MarchingBorder */}
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
                onClick={() => onSelectCampaign(featuredCampaign.address)}
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
                  value={(parseFloat(featuredCampaign.totalRaised) / parseFloat(featuredCampaign.goal)) * 100}
                  label={`${featuredCampaign.totalRaised} ETH raised of ${featuredCampaign.goal} ETH target`}
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

        {/* Campaigns Grid with Cubby UI Cards */}
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
                <Card
                  key={c.id}
                  interactive
                  onClick={() => onSelectCampaign(c.address)}
                  className="group relative flex flex-col overflow-hidden bg-[#0d121c] hover:bg-[#111724]"
                >
                  {/* Subtle Marching Border on ending soon campaigns */}
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
                      <Badge variant="default" size="sm">
                        {c.category}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">{getStatusBadge(c.status)}</div>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Avatar address={c.creator} size="sm" />
                        <span className="font-mono text-[11px] truncate">{c.creator.slice(0, 6)}...{c.creator.slice(-4)}</span>
                      </div>
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
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Cubby UI Accordion: How Trustless Non-Custodial Escrow Works */}
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

        <Accordion type="single" defaultValue={["sec-1"]}>
          <AccordionItem value="sec-1">
            <AccordionTrigger value="sec-1">
              How does the All-or-Nothing code guarantee work?
            </AccordionTrigger>
            <AccordionContent value="sec-1">
              Every campaign is deployed as a standalone smart contract escrow clone. Contributions are stored directly in the contract&apos;s escrow balance. Funds cannot be withdrawn until the deadline passes and the total raised amount is greater than or equal to the goal. If the target is not reached by the deadline timestamp, the contract state shifts to Failed, unlocking 100% refunds for all contributors with zero platform deductions.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sec-2">
            <AccordionTrigger value="sec-2">
              What is EIP-1167 and why does Crowdr use it?
            </AccordionTrigger>
            <AccordionContent value="sec-2">
              EIP-1167 is the Ethereum standard for Minimal Proxy Clones. Instead of deploying a full bytecode copy for every campaign (which can cost 0.05+ ETH in gas), Crowdr clones a master reference contract in under 45 bytes of deployment bytecode. This drops deployment gas costs by over 90% while guaranteeing that every escrow executes identical, immutable, audited logic.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sec-3">
            <AccordionTrigger value="sec-3">
              How do refunds work if a project fails or is flagged?
            </AccordionTrigger>
            <AccordionContent value="sec-3">
              Backers can trigger their refund with a single transaction or call the claimRefund method. The smart contract calculates the backer&apos;s total balance, sets their pledge to 0, and sends the exact ETH back using a non-reentrant call pattern. There are no admin approval requirements or processing delays.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
};
