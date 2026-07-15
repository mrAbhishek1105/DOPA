"use client";

import { useEffect, useState } from "react";
import { healthApi } from "@/lib/api/health";
import { Wifi, WifiOff } from "lucide-react";

export function HealthIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const status = await healthApi.checkHealth();
      setIsConnected(status);
    };

    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
        Checking...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      {isConnected ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-40" />
            <div className="relative w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
          </div>
          <Wifi size={12} className="text-green-500/70" />
          <span className="text-green-500/80 hidden sm:inline">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
          <WifiOff size={12} className="text-red-500/70" />
          <span className="text-red-500/80 hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
}
