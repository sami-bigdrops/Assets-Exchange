
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SyncInfo {
    jobId: string | null;
    active: boolean;
    status: string;
    progress: number;
    total: number;
}

interface SyncState {
    offers: SyncInfo;
    advertisers: SyncInfo;
    startSync: (type: "everflow_sync" | "everflow_sync_advertisers") => Promise<void>;
    cancelSync: (type: "everflow_sync" | "everflow_sync_advertisers") => Promise<void>;
}

const SyncContext = createContext<SyncState | undefined>(undefined);

export function GlobalSyncProvider({ children }: { children: React.ReactNode }) {
    const [offersSync, setOffersSync] = useState<SyncInfo>({
        jobId: null,
        active: false,
        status: "idle",
        progress: 0,
        total: 0,
    });

    const [advertisersSync, setAdvertisersSync] = useState<SyncInfo>({
        jobId: null,
        active: false,
        status: "idle",
        progress: 0,
        total: 0,
    });

    useEffect(() => {
        const checkActiveJobs = async () => {
            try {
                const offersRes = await fetch("/api/admin/everflow/active-job?type=everflow_sync");
                if (offersRes.ok) {
                    const data = await offersRes.json();
                    if (data.active && data.jobId) {
                        setOffersSync({
                            jobId: data.jobId,
                            active: true,
                            status: data.status,
                            progress: data.progress || 0,
                            total: data.total || 0,
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to check offers sync", e);
            }

            try {
                const advRes = await fetch("/api/admin/everflow/active-job?type=everflow_advertiser_sync");
                if (advRes.ok) {
                    const data = await advRes.json();
                    if (data.active && data.jobId) {
                        setAdvertisersSync({
                            jobId: data.jobId,
                            active: true,
                            status: data.status,
                            progress: data.progress || 0,
                            total: data.total || 0,
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to check advertisers sync", e);
            }
        };

        checkActiveJobs();
    }, []);

    useEffect(() => {
        if (!offersSync.jobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/admin/everflow/sync-status/${offersSync.jobId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (["completed", "failed", "cancelled"].includes(data.status)) {
                    setOffersSync(prev => ({
                        ...prev,
                        status: data.status,
                        progress: data.progress || 0,
                        total: data.total || 0,
                    }));
                    setTimeout(() => {
                        setOffersSync({
                            jobId: null,
                            active: false,
                            status: "idle",
                            progress: 0,
                            total: 0,
                        });
                    }, 5000);
                } else {
                    setOffersSync(prev => ({
                        ...prev,
                        status: data.status,
                        progress: data.progress || 0,
                        total: data.total || 0,
                    }));
                }
            } catch (e) {
                console.error("Poll error for offers sync", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [offersSync.jobId]);

    useEffect(() => {
        if (!advertisersSync.jobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/admin/everflow/sync-status/${advertisersSync.jobId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (["completed", "failed", "cancelled"].includes(data.status)) {
                    setAdvertisersSync(prev => ({
                        ...prev,
                        status: data.status,
                        progress: data.progress || 0,
                        total: data.total || 0,
                    }));
                    setTimeout(() => {
                        setAdvertisersSync({
                            jobId: null,
                            active: false,
                            status: "idle",
                            progress: 0,
                            total: 0,
                        });
                    }, 5000);
                } else {
                    setAdvertisersSync(prev => ({
                        ...prev,
                        status: data.status,
                        progress: data.progress || 0,
                        total: data.total || 0,
                    }));
                }
            } catch (e) {
                console.error("Poll error for advertisers sync", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [advertisersSync.jobId]);

    const startSync = async (syncType: "everflow_sync" | "everflow_sync_advertisers") => {
        const endpoint = syncType === "everflow_sync"
            ? "/api/admin/everflow/sync"
            : "/api/admin/everflow/advertisers/sync";

        const setSyncState = syncType === "everflow_sync" ? setOffersSync : setAdvertisersSync;

        try {
            setSyncState(prev => ({
                ...prev,
                status: "pending",
                progress: 0,
                total: 0,
            }));

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });

            if (!res.ok) throw new Error("Failed to start sync");

            const data = await res.json();
            setSyncState({
                jobId: data.jobId,
                active: true,
                status: "pending",
                progress: 0,
                total: 0,
            });
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const cancelSync = async (syncType: "everflow_sync" | "everflow_sync_advertisers") => {
        const syncState = syncType === "everflow_sync" ? offersSync : advertisersSync;
        if (!syncState.jobId) return;

        try {
            await fetch(`/api/admin/everflow/cancel/${syncState.jobId}`, { method: "POST" });
            const setSyncState = syncType === "everflow_sync" ? setOffersSync : setAdvertisersSync;
            setSyncState(prev => ({
                ...prev,
                status: "cancelled",
                active: false,
            }));
        } catch (e) {
            console.error("Failed to cancel sync", e);
        }
    };

    return (
        <SyncContext.Provider value={{
            offers: offersSync,
            advertisers: advertisersSync,
            startSync,
            cancelSync
        }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useGlobalSync() {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useGlobalSync must be used within GlobalSyncProvider");
    return context;
}
