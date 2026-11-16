"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWeb3 } from "@/context/Web3Context";
import { ethers } from "ethers";
import {
  Coins,
  PlusCircle,
  Compass,
  Wallet,
  ShieldCheck,
  ChevronDown,
  Layers,
  Search,
  AlertTriangle,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { Kbd, Badge, Avatar, FancyButton } from "@/components/ui/cubby-ui";

interface NavbarProps {
  onOpenCommandMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandMenu }) => {
  const pathname = usePathname();
  const {
    wallet,
    isWrongNetwork,
    targetChainId,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isPaused,
    isOwner,
  } = useWeb3();

  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedBalance = wallet.balance > 0n
    ? parseFloat(ethers.formatEther(wallet.balance)).toFixed(3)
    : "0.000";

  return (
    <header className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-2xl border-b border-white/[0.08] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
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
              <p className="text-[10px] text-slate-400 leading-none tracking-tight">
                Trustless Escrows
              </p>
            </div>
          </Link>

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
              { href: "/", label: "Explore", icon: Compass },
              { href: "/create", label: "Launch Escrow", icon: PlusCircle },
              { href: "/dashboard", label: "Dashboard", icon: Layers },
              ...(isOwner ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Wallet & Status Controls */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {isPaused && (
              <Badge variant="warning" size="sm" dot>
                Factory Paused
              </Badge>
            )}

            {isWrongNetwork && (
              <button
                onClick={() => switchNetwork(targetChainId)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Switch to Chain {targetChainId}</span>
              </button>
            )}

            {wallet.isConnected && wallet.address ? (
              <>
                {/* Live Balance Chip */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs font-mono">
                  <span className="text-slate-400">Balance:</span>
                  <span className="font-bold text-emerald-400">{formattedBalance} ETH</span>
                </div>

                {/* Connected Wallet Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                    className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#0e131d] hover:bg-[#131b29] border border-white/[0.1] text-xs text-slate-200 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] cursor-pointer active:scale-95"
                  >
                    <Avatar address={wallet.address} size="sm" status="online" />
                    <span className="hidden sm:inline font-mono font-semibold text-slate-100">
                      {shortenAddress(wallet.address)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showWalletDropdown && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0f1420] border border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Connected Wallet</span>
                        <Badge variant="cyan" size="sm">
                          Chain {wallet.chainId}
                        </Badge>
                      </div>

                      <div className="p-2 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Address:</span>
                          <span className="font-mono text-white text-[11px]">
                            {shortenAddress(wallet.address)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">ETH Balance:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {formattedBalance} ETH
                          </span>
                        </div>
                        {isOwner && (
                          <div className="pt-1">
                            <Badge variant="purple" size="sm">
                              Factory Owner
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/[0.08] space-y-1">
                        <button
                          onClick={handleCopy}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.05] transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            {copied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {copied ? "Copied!" : "Copy Address"}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            disconnectWallet();
                            setShowWalletDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <FancyButton
                variant="glow"
                size="sm"
                onClick={connectWallet}
                className="gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{wallet.isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </FancyButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
