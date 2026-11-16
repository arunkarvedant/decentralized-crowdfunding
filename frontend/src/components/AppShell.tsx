"use client";

import React, { useState } from "react";
import { Web3Provider } from "@/context/Web3Context";
import { Navbar } from "@/components/Navbar";
import { CommandMenu } from "@/components/ui/cubby-ui/command-menu";
import { Coins, Shield, Code2 } from "lucide-react";
import { Kbd } from "@/components/ui/cubby-ui/kbd";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  return (
    <Web3Provider>
      <div className="min-h-screen flex flex-col bg-[#080a0e] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
        {/* Command Palette Modal */}
        <CommandMenu
          isOpen={isCommandMenuOpen}
          onClose={() => setIsCommandMenuOpen(false)}
        />

        {/* Tactile Navbar */}
        <Navbar onOpenCommandMenu={() => setIsCommandMenuOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16">
          {children}
        </main>

        {/* Tactile Footer */}
        <footer className="border-t border-white/[0.08] bg-[#07090d]/80 py-8 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Coins className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="font-bold text-slate-200">Crowdr ETH</span>
              <span>— Trustless All-or-Nothing Escrow</span>
            </div>

            <div className="flex items-center space-x-6 text-slate-400">
              <span className="flex items-center space-x-1.5 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audited Logic</span>
              </span>
              <span className="flex items-center space-x-1.5 text-[11px]">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>EIP-1167 Clones</span>
              </span>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                <span>Search:</span>
                <Kbd size="xs" keys={["mod", "K"]} />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Web3Provider>
  );
}
