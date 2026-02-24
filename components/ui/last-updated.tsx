"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";

export function dispatchDashboardRefresh() {
  window.dispatchEvent(new CustomEvent("dashboard-refresh"));
}

export function LastUpdated() {
  const [time, setTime] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const variables = getVariables();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, "0");
      setTime(`${displayHours} : ${displayMinutes} ${ampm}`);
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    const refreshInterval = setInterval(() => {
      dispatchDashboardRefresh();
      startTransition(() => {
        router.refresh();
      });
    }, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
    };
  }, [router]);

  const handleRefresh = () => {
    dispatchDashboardRefresh();
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="outline"
      className=" p-4 lg:p-4.5 xl:p-5.5"
      onClick={handleRefresh}
      disabled={isPending}
    >
      <RefreshCw
        className={`size-4 xl:size-4.5 font-inter text-xs lg:text-[0.8rem] xl:text-[0.9rem] font-medium ${isPending ? "animate-spin" : ""}`}
        style={{
          color: variables.colors.headerIconColor,
        }}
      />
      <span className="font-inter text-xs lg:text-[0.8rem] xl:text-[0.9rem] font-medium">
        {isPending ? "Updating..." : `Last Updated: ${time}`}
      </span>
    </Button>
  );
}
