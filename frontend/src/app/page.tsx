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
import { Coins, Shield, ExternalLink, Heart } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("explore");
  const [selectedCampaignAddress, setSelectedCampaignAddress] = useState<string | null>(null);

  return (
    <Web3Provider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSelectCampaign={setSelectedCampaignAddress}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-300">Crowdr ETH</span>
              <span>— Trustless All-or-Nothing Crowdfunding</span>
            </div>

            <div className="flex items-center space-x-6 text-[11px]">
              <span className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Non-Custodial Smart Contracts</span>
              </span>
              <span>•</span>
              <span>Solidity 0.8.20 + EIP-1167 Clones</span>
              <span>•</span>
              <span>PRD v1.0 Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </Web3Provider>
  );
}
