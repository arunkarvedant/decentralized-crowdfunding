"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { FancyButton } from "@/components/ui/cubby-ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold text-white tracking-tight">Something went wrong</h1>
        <p className="text-sm text-slate-400 font-mono text-xs p-3 bg-white/[0.04] rounded-xl border border-white/[0.08] break-all">
          {error.message || "An unexpected error occurred while communicating with the Ethereum network."}
        </p>
      </div>
      <FancyButton variant="default" size="md" onClick={() => reset()} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </FancyButton>
    </div>
  );
}
