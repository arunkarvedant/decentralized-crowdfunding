'use client';

import React from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { UserRole } from '@/types';

interface HeaderProps {
  onOpenAddDoc: () => void;
  onSearchFocus: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  userRole: UserRole;
}

export default function Header({
  onOpenAddDoc,
  onSearchFocus,
  searchQuery,
  setSearchQuery,
  isDark,
  setIsDark,
  userRole
}: HeaderProps) {
  return (
    <header
      className={`h-16 px-6 border-b flex items-center justify-between transition-colors duration-200 select-none ${
        isDark
          ? 'bg-[#0B0F19] border-slate-800 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Search Bar matching Image 1 Nexora AI Header */}
      <div className="flex-1 max-w-xl">
        <div
          className={`relative flex items-center rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 focus-within:border-blue-500'
              : 'bg-slate-50 border-slate-200 focus-within:border-blue-500 shadow-inner'
          }`}
        >
          <Search className="w-4 h-4 ml-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Search documents, folders, tags, meeting notes..."
            className={`w-full py-2 px-3 text-xs bg-transparent focus:outline-none placeholder:text-slate-400 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          />
          <kbd
            className={`mr-3 text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-200/70 border-slate-300 text-slate-500'
            }`}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: RBAC Security Badge, Theme Toggle, Notification Bell, Help, Add Document */}
      <div className="flex items-center gap-3">
        {/* Pre-Retrieval RBAC Badge */}
        <div
          title="PRD Module 2: Strict pre-retrieval filtering in pgvector"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isDark
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>RBAC Guard: {userRole}</span>
        </div>

        {/* Theme Toggle (Dual-Mode: Nexora Light vs Ask AI Dark) */}
        <button
          onClick={() => setIsDark(!isDark)}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400'
              : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className={`p-2 rounded-xl border transition-all relative ${
              isDark
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>
        </div>

        {/* Help Circle */}
        <button
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Primary Action Button: Add Document (Matching Nexora UI Image 1) */}
        <button
          onClick={onOpenAddDoc}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
          <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
        </button>
      </div>
    </header>
  );
}
