"use client";

import { ArrowLeft, FileText, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreativeReview } from "@/features/admin";

interface RequestCreativeRow {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface CreativeReviewPageClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any;
  creatives: RequestCreativeRow[];
}

export function CreativeReviewPageClient({
  request,
  creatives,
}: CreativeReviewPageClientProps) {
  const router = useRouter();
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>(
    creatives[0]?.id || ""
  );

  const selectedCreative = creatives.find((c) => c.id === selectedCreativeId);

  if (!selectedCreative) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">
          No creatives found for this request.
        </h2>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="flex-none bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {request.offerName}
              <Badge variant="outline" className="text-xs font-normal">
                {request.status}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Request ID: {request.id}
            </p>
          </div>
        </div>

        {creatives.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Files:</span>
            <div className="flex gap-2">
              {creatives.map((c) => (
                <Button
                  key={c.id}
                  variant={selectedCreativeId === c.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCreativeId(c.id)}
                  className="text-xs"
                >
                  {c.type.startsWith("image") ? (
                    <ImageIcon className="w-3 h-3 mr-1" />
                  ) : (
                    <FileText className="w-3 h-3 mr-1" />
                  )}
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <CreativeReview
          key={selectedCreative.id}
          creativeId={selectedCreative.id}
          creativeUrl={selectedCreative.url}
          creativeType={
            selectedCreative.type.startsWith("image") ? "image" : "html"
          }
        />
      </main>
    </div>
  );
}
