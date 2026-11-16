"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Compass, PlusCircle, Wallet, Layers, ShieldCheck, X, ArrowRight, User } from "lucide-react";
import { Kbd } from "./kbd";
import { useWeb3, DEMO_ACCOUNTS } from "@/context/Web3Context";

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, campaignAddress?: string) => void;
}

export function CommandMenu({ isOpen, onClose, onNavigate }: CommandMenuProps) {
  const { campaigns, connectDemoAccount } = useWeb3();
  const [query, setQuery] = React.useState("");

  // Keyboard shortcut listener (⌘K / Ctrl+K & Escape)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.summary.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0e121a] border border-white/[0.12] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search campaigns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <Kbd size="xs">Esc</Kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          <div className="space-y-1">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Quick Navigation
            </p>
            {[
              { id: "explore", label: "Explore Campaigns", icon: Compass },
              { id: "create", label: "Launch New Campaign", icon: PlusCircle },
              { id: "backer", label: "Backer Dashboard & Refunds", icon: Wallet },
              { id: "creator", label: "Creator Dashboard & Payouts", icon: Layers },
              { id: "admin", label: "Platform Governance & Admin", icon: ShieldCheck },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    onNavigate(action.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                    <span>{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </button>
              );
            })}
          </div>

          {/* Quick Persona Switcher */}
          <div className="space-y-1 pt-2 border-t border-white/[0.06]">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Switch Test Persona
            </p>
            <div className="grid grid-cols-3 gap-1.5 px-1">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={acc.address}
                  onClick={() => {
                    connectDemoAccount(idx);
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors"
                >
                  <p className="text-[11px] font-semibold text-slate-200">{acc.name}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{acc.balance} ETH</p>
                </button>
              ))}
            </div>
          </div>

          {/* Campaigns Matching Query */}
          {filteredCampaigns.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/[0.06]">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Campaigns ({filteredCampaigns.length})
              </p>
              {filteredCampaigns.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onNavigate("campaign", c.address);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                        {c.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {c.totalRaised} / {c.goal} ETH • {c.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 shrink-0">
                    {c.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with arrows or click</span>
          <div className="flex items-center gap-2">
            <span>Close</span>
            <Kbd size="xs">Esc</Kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
