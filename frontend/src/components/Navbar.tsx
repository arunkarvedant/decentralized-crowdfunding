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
  Check,
  Flame,
  Activity,
} from "lucide-react";
import { Kbd, Badge, Avatar, Tooltip } from "@/components/ui/cubby-ui";

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
  const { account, accountName, balance, connectDemoAccount, isPaused } = useWeb3();
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
    <header className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-2xl border-b border-white/[0.08] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
            onClick={() => handleNav("explore")}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-700 p-[1.5px] shadow-[0_2px_12px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0b0f16] rounded-[10px] flex items-center justify-center">
                <Coins className="w-4.5 h-4.5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  Crowdr
                </span>
                <Badge variant="success" size="sm" dot pulse>
                  ETH
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 leading-none tracking-tight">Trustless Escrows</p>
            </div>
          </div>

          {/* Quick Search / Command Palette Bar */}
          <button
            onClick={onOpenCommandMenu}
            type="button"
            className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer w-64 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="flex-1 text-left font-sans">Quick search or command...</span>
            <Kbd size="xs" keys={["mod", "K"]} />
          </button>

          {/* Segmented Navigation Links (Tactile Cubby UI Pills) */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: "explore", label: "Explore", icon: Compass },
              { id: "create", label: "Launch Escrow", icon: PlusCircle },
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Wallet, Status Pill & Quick Persona Switcher */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {isPaused && (
              <Badge variant="warning" size="sm" dot>
                Factory Paused
              </Badge>
            )}

            {/* Live Balance Chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs font-mono">
              <span className="text-slate-400">Balance:</span>
              <span className="font-bold text-emerald-400">{parseFloat(balance).toFixed(2)} ETH</span>
            </div>

            {/* Persona Switcher Dropdown with Cubby UI Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#0e131d] hover:bg-[#131b29] border border-white/[0.1] text-xs text-slate-200 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] cursor-pointer active:scale-95"
                title="Switch test persona"
              >
                <Avatar address={account} name={accountName} size="sm" status="online" />
                <span className="hidden sm:inline font-semibold text-slate-100">{accountName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0f1420] border border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Switch Test Persona (0 Friction)</span>
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  </div>

                  <div className="p-1 space-y-1">
                    {DEMO_ACCOUNTS.map((acc, idx) => {
                      const isCurrent = account.toLowerCase() === acc.address.toLowerCase();
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            connectDemoAccount(idx);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                            isCurrent
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                              : "hover:bg-white/[0.05] text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar address={acc.address} name={acc.name} size="sm" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white">{acc.name}</span>
                                <Badge variant="outline" size="sm">
                                  {acc.role}
                                </Badge>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 block">
                                {shortenAddress(acc.address)} • {acc.balance} ETH
                              </span>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-1 border-t border-white/[0.08] px-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>EIP-1167 Escrow Factory</span>
                    <Badge variant="cyan" size="sm">
                      Sepolia Testnet
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
