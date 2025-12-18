"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getRecentAdvertiserResponses } from "../services/request.service";
import type { Request as RequestType } from "../types/admin.types";

import { RequestSection } from "./RequestSection";

export function Response() {
  const variables = getVariables();
  const [isHovered, setIsHovered] = useState(false);
  const [responses, setResponses] = useState<RequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const data = await getRecentAdvertiserResponses(3);
        setResponses(data);
      } catch (error) {
        console.error("Failed to fetch recent responses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
  }, []);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Incoming Advertiser Response
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (responses.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Incoming Advertiser Response
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">No responses available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="-mt-6 mb-0 px-6 py-6 gap-4 flex flex-row items-center justify-between"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
        <CardTitle
          className="xl:text-lg text-sm lg:text-base font-inter font-medium"
          style={{ color: variables.colors.cardHeaderTextColor }}
        >
          Incoming Advertiser Response
        </CardTitle>

        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          <Link href="/response">
            <Button
              className="md:h-8.5 md:w-20 lg:h-9.5 lg:w-21.5 xl:h-10.5 xl:w-23 font-inter font-medium rounded-[6px] transition-colors"
              style={{
                backgroundColor: isHovered ? "#FFFFFF" : "#FFFFFF",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span
                className="text-xs lg:text-sm font-medium xl:text-[0.95rem]"
                style={{
                  color: isHovered ? "#2563EB" : "#2563EB",
                }}
              >
                View All
              </span>
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <RequestSection requests={responses} />
      </CardContent>
    </Card>
  );
}
