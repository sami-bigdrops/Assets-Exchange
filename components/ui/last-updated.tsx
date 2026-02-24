"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";

export function LastUpdated() {
  const [time, setTime] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
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
      router.refresh();
    }, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
    };
  }, [router]);

  const handleRefresh = () => {
    setIsUpdating(true);
    router.refresh();
    setTimeout(() => {
      setIsUpdating(false);
    }, 1000);
  };

  return (
    <Button
      variant="outline"
      className=" p-4 lg:p-4.5 xl:p-5.5"
      onClick={handleRefresh}
      disabled={isUpdating}
    >
      <RefreshCw
        className={`size-4 xl:size-4.5 font-inter text-xs lg:text-[0.8rem] xl:text-[0.9rem] font-medium ${isUpdating ? "animate-spin" : ""}`}
        style={{
          color: variables.colors.headerIconColor,
        }}
      />
      <span className="font-inter text-xs lg:text-[0.8rem] xl:text-[0.9rem] font-medium">
        {isUpdating ? "Updating..." : `Last Updated: ${time}`}
      </span>
    </Button>
  );
}
