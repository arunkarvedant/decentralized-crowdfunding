"use client";

import React, { useState } from "react";
import { useWeb3, DEMO_ACCOUNTS } from "@/context/Web3Context";
import {
  Coins,
  PlusCircle,
  Compass,
  Wallet,
  ShieldCheck,
  ChevronDown,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";
import { Kbd } from "@/components/ui/cubby-ui/kbd";
import { FancyButton } from "@/components/ui/cubby-ui/fancy-button";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectCampaign: (address: string | null) => void;
  onOpenCommandMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectCampaign,
  onOpenCommandMenu,
}) => {
  const { account, accountName, balance, connectDemoAccount, connectInjectedWallet, isPaused } =
    useWeb3();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleNav = (tab: string) => {
    onSelectCampaign(null);
    setActiveTab(tab);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090c12]/90 backdrop-blur-xl border-b border-white/[0.08] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
            onClick={() => handleNav("explore")}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-emerald-400 to-teal-600 p-[1.5px] shadow-[0_2px_10px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0c1017] rounded-[10px] flex items-center justify-center">
                <Coins className="w-4.5 h-4.5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  Crowdr
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 rounded border border-emerald-500/30">
                  ETH
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">Trustless All-or-Nothing</p>
            </div>
          </div>

          {/* Quick Search / Command Palette Bar */}
          <button
            onClick={onOpenCommandMenu}
            type="button"
            className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer w-64 shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="flex-1 text-left">Search or command...</span>
            <Kbd size="xs" keys={["mod", "K"]} />
          </button>

          {/* Segmented Navigation Links */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: "explore", label: "Explore", icon: Compass },
              { id: "create", label: "Launch", icon: PlusCircle },
              { id: "backer", label: "Backer", icon: Wallet },
              { id: "creator", label: "Creator", icon: Layers },
              { id: "admin", label: "Admin", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNav(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Wallet & Quick Role Switcher */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {isPaused && (
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Factory Paused
              </span>
            )}

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/[0.1] text-xs text-slate-200 transition-all shadow-sm active:scale-95"
                title="Switch test persona"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                <span className="font-semibold">{accountName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e121a] border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Test Personas (Zero Friction)</span>
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  </div>

                  <div className="p-1 space-y-0.5">
                    {DEMO_ACCOUNTS.map((acc, idx) => (
                      <button
                        key={acc.address}
                        onClick={() => {
                          connectDemoAccount(idx);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          account.toLowerCase() === acc.address.toLowerCase()
                            ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30"
                            : "text-slate-300 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{acc.name}</div>
                          <div className="text-[10px] text-slate-500">{acc.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-emerald-400 font-bold">{acc.balance} ETH</div>
                          <div className="text-[10px] text-slate-500 font-mono">{shortenAddress(acc.address)}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-white/[0.08] mt-1 pt-1.5 px-2">
                    <FancyButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        connectInjectedWallet();
                        setShowRoleDropdown(false);
                      }}
                      className="w-full"
                    >
                      Connect Browser Wallet
                    </FancyButton>
                  </div>
                </div>
              )}
            </div>

            {/* Tactile Balance Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs shadow-inner">
              <span className="text-[10px] text-slate-400 font-mono">ETH:</span>
              <span className="font-mono font-bold text-emerald-400">{balance}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
