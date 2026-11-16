import Link from "next/link";
import { Compass } from "lucide-react";
import { FancyButton } from "@/components/ui/cubby-ui";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <Compass className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">404 — Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The campaign or escrow page you are looking for does not exist on-chain or may have been relocated.
        </p>
      </div>
      <Link href="/">
        <FancyButton variant="glow" size="md">
          Return to Explore
        </FancyButton>
      </Link>
    </div>
  );
}
