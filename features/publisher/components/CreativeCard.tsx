"use client";

import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { CreativeRequest } from "@/features/admin/types/request.types";


export interface CreativeCardProps {
  request: CreativeRequest;
  thumbnailUrl?: string | null;
  onViewClick?: (requestId: string) => void;
}

export function CreativeCard({
  request,
  thumbnailUrl,
  onViewClick,
}: CreativeCardProps) {
  const variables = getVariables();
  const isApproved = request.status === "approved";

  return (
    <Card className="overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="p-0 aspect-[4/3] bg-muted relative overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className="object-cover object-center"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: variables.colors.inputBackgroundColor }}
          >
            <ImageIcon
              className="w-12 h-12 opacity-40"
              style={{ color: variables.colors.descriptionColor }}
            />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className="px-2 py-1 rounded-md text-xs font-medium"
            style={{
              backgroundColor: isApproved ? "#dcfce7" : "#fee2e2",
              color: isApproved ? "#166534" : "#991b1b",
            }}
          >
            {request.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col gap-1">
        <p
          className="text-sm font-medium line-clamp-2"
          style={{ color: variables.colors.inputTextColor }}
        >
          {request.offerName}
        </p>
        <p
          className="text-xs line-clamp-1"
          style={{ color: variables.colors.descriptionColor }}
        >
          {request.advertiserName}
        </p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs font-medium"
          style={{
            borderColor: variables.colors.inputBorderColor,
            color: variables.colors.inputTextColor,
            backgroundColor: variables.colors.cardBackground,
          }}
          onClick={() => onViewClick?.(request.id)}
        >
          View Creative
        </Button>
      </CardFooter>
    </Card>
  );
}
