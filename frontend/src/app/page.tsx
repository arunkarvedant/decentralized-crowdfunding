"use client";

import React, { useState } from "react";
import { Web3Provider } from "@/context/Web3Context";
import { Navbar } from "@/components/Navbar";
import { ExploreView } from "@/components/ExploreView";
import { CampaignDetailView } from "@/components/CampaignDetailView";
import { CreateCampaignWizard } from "@/components/CreateCampaignWizard";
import { CreatorDashboardView } from "@/components/CreatorDashboardView";
import { BackerDashboardView } from "@/components/BackerDashboardView";
import { AdminPanelView } from "@/components/AdminPanelView";
import { CommandMenu } from "@/components/ui/cubby-ui/command-menu";
import { Coins, Shield } from "lucide-react";
import { Kbd } from "@/components/ui/cubby-ui/kbd";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("explore");
  const [selectedCampaignAddress, setSelectedCampaignAddress] = useState<string | null>(null);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState<boolean>(false);

  const handleCommandNavigate = (tab: string, campaignAddress?: string) => {
    if (tab === "campaign" && campaignAddress) {
      setSelectedCampaignAddress(campaignAddress);
    } else {
      setSelectedCampaignAddress(null);
      setActiveTab(tab);
    }
  };

  return (
    <Web3Provider>
      <div className="min-h-screen flex flex-col bg-[#080a0e] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
        {/* Command Palette Modal */}
        <CommandMenu
          isOpen={isCommandMenuOpen}
          onClose={() => setIsCommandMenuOpen(false)}
          onNavigate={handleCommandNavigate}
        />

        {/* Tactile Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSelectCampaign={setSelectedCampaignAddress}
          onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          {selectedCampaignAddress ? (
            <CampaignDetailView
              campaignAddress={selectedCampaignAddress}
              onBack={() => setSelectedCampaignAddress(null)}
            />
          ) : (
            <>
              {activeTab === "explore" && (
                <ExploreView
                  onSelectCampaign={(addr) => setSelectedCampaignAddress(addr)}
                  onLaunchClick={() => setActiveTab("create")}
                  onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
                />
              )}

              {activeTab === "create" && (
                <CreateCampaignWizard
                  onSuccess={(newAddr) => {
                    setSelectedCampaignAddress(newAddr);
                  }}
                />
              )}

              {activeTab === "creator" && (
                <CreatorDashboardView
                  onSelectCampaign={(addr) => setSelectedCampaignAddress(addr)}
                  onLaunchNew={() => setActiveTab("create")}
                />
              )}

              {activeTab === "backer" && (
                <BackerDashboardView
                  onSelectCampaign={(addr) => setSelectedCampaignAddress(addr)}
                  onExplore={() => setActiveTab("explore")}
                />
              )}

              {activeTab === "admin" && <AdminPanelView />}
            </>
          )}
        </main>

        {/* Precision Tactile Footer */}
        <footer className="border-t border-white/[0.08] bg-[#07090d]/80 py-8 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Coins className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="font-bold text-slate-200">Crowdr ETH</span>
              <span>— Trustless All-or-Nothing Escrow</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>EIP-1167 Minimal Clones</span>
              </span>
              <span>•</span>
              <button
                onClick={() => setIsCommandMenuOpen(true)}
                className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
              >
                <span>Command Palette</span>
                <Kbd size="xs" keys={["mod", "K"]} />
              </button>
              <span>•</span>
              <span className="text-emerald-400/90">Cubby UI Design Tokens</span>
            </div>
          </div>
        </footer>
      </div>
    </Web3Provider>
  );
}
