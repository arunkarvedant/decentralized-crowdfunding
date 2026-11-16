import { Coins } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
        <Coins className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="text-xs text-slate-400 font-mono tracking-wider uppercase animate-pulse">
        Synchronizing On-Chain State...
      </p>
    </div>
  );
}
