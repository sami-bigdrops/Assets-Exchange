
"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGlobalSync } from "@/features/admin/context/GlobalSyncContext";

function SyncNotificationCard({
    label,
    status,
    progress,
    total,
    onCancel
}: {
    label: string;
    status: string;
    progress: number;
    total: number;
    onCancel: () => void;
}) {
    const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

    return (
        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-indigo-100 rounded-lg pl-3 pr-2 h-12 shadow-sm ring-1 ring-indigo-50/50 w-80">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[2px] opacity-20 animate-pulse"></div>
                {status === "pending" || status === "running" ? (
                    <Spinner className="h-4 w-4 text-indigo-600 relative z-10" />
                ) : status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-500 relative z-10" />
                ) : (
                    <XCircle className="h-4 w-4 text-red-500 relative z-10" />
                )}
            </div>

            <div className="flex flex-col min-w-[200px] gap-1.5 flex-1">
                <div className="flex justify-between items-end text-xs gap-4">
                    <span className="font-semibold text-indigo-950 whitespace-nowrap">
                        {status === "pending" ? (
                            <span className="animate-pulse">Initializing...</span>
                        ) : status === "completed" ? (
                            <span className="text-green-600">Synced {label}</span>
                        ) : status === "failed" ? (
                            <span className="text-red-600">Sync Failed</span>
                        ) : (
                            <span className="flex items-center gap-1">
                                Syncing {label}
                                <span className="text-indigo-600 font-bold">
                                    {percent}%
                                </span>
                            </span>
                        )}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono tabular-nums tracking-tight whitespace-nowrap">
                        {progress.toLocaleString()} / {total > 0 ? total.toLocaleString() : "--"}
                    </span>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-50">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${status === "failed"
                            ? "bg-red-500"
                            : status === "completed"
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-[shimmer_2s_infinite] shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                            }`}
                        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                    />
                </div>
            </div>

            {(status === "pending" || status === "running") && (
                <>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200"
                        onClick={onCancel}
                        title="Cancel Sync"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </>
            )}
        </div>
    );
}

export function GlobalSyncIndicator() {
    const { offers, advertisers, cancelSync } = useGlobalSync();
    const pathname = usePathname();

    const isOnOffersPage = pathname?.includes("/offers");
    const isOnAdvertisersPage = pathname?.includes("/advertisers");

    const shouldShowOffers = offers.active;
    const shouldShowAdvertisers = advertisers.active;

    if (!shouldShowOffers && !shouldShowAdvertisers) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {shouldShowOffers && !isOnOffersPage && (
                <SyncNotificationCard
                    label="Offers"
                    status={offers.status}
                    progress={offers.progress}
                    total={offers.total}
                    onCancel={async () => {
                        try {
                            await cancelSync("everflow_sync");
                        } catch (e) {
                            console.error("Failed to cancel offers sync", e);
                        }
                    }}
                />
            )}
            {shouldShowAdvertisers && !isOnAdvertisersPage && (
                <SyncNotificationCard
                    label="Advertisers"
                    status={advertisers.status}
                    progress={advertisers.progress}
                    total={advertisers.total}
                    onCancel={async () => {
                        try {
                            await cancelSync("everflow_sync_advertisers");
                        } catch (e) {
                            console.error("Failed to cancel advertisers sync", e);
                        }
                    }}
                />
            )}
        </div>
    );
}
