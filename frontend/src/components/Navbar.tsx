"use client";

import React, { useState } from "react";
import { useWeb3, DEMO_ACCOUNTS } from "@/context/Web3Context";
import {
  Coins,
  PlusCircle,
  Compass,
  Wallet,
  ShieldCheck,
  User,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectCampaign: (address: string | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectCampaign,
}) => {
  const { account, accountName, balance, isRealWallet, connectDemoAccount, connectInjectedWallet, isPaused } =
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
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => handleNav("explore")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                  Crowdr
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                  ETH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Trustless All-or-Nothing</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => handleNav("explore")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "explore"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => handleNav("create")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "create"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Launch Campaign</span>
            </button>

            <button
              onClick={() => handleNav("backer")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "backer"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Backer Dashboard</span>
            </button>

            <button
              onClick={() => handleNav("creator")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "creator"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Creator Dashboard</span>
            </button>

            <button
              onClick={() => handleNav("admin")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "admin"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Wallet & Quick Role Switcher */}
          <div className="flex items-center space-x-3">
            {isPaused && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Factory Paused
              </span>
            )}

            {/* Role dropdown for frictionless testing */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition-colors"
                title="Switch persona for testing all user stories"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">{accountName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Switch Test Persona</span>
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  </div>
                  {DEMO_ACCOUNTS.map((acc, idx) => (
                    <button
                      key={acc.address}
                      onClick={() => {
                        connectDemoAccount(idx);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 flex items-center justify-between ${
                        account.toLowerCase() === acc.address.toLowerCase()
                          ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                          : "text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{acc.name}</div>
                        <div className="text-[10px] text-slate-500">{acc.role}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-emerald-400">{acc.balance} ETH</div>
                        <div className="text-[10px] text-slate-500">{shortenAddress(acc.address)}</div>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-slate-800 mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        connectInjectedWallet();
                        setShowRoleDropdown(false);
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Connect MetaMask / Rabby</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Balance Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400">Balance:</span>
              <span className="font-mono text-xs font-semibold text-emerald-400">{balance} ETH</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
