"use client";

import {
  Loader2,
  ArrowUpCircle,
  Eye,
  MessageSquare,
  UserCheck,
  FileCheck,
  Download,
  FileType,
  Play,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";

import { Constants } from "@/app/Constants/Constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StatusTracker } from "@/features/publisher/components/thankYou/StatusTracker";

interface Creative {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface TrackingData {
  id: string;
  offerName: string;
  status: string;
  approvalStage: string;
  adminStatus: string;
  adminComments: string | null;
  submittedAt: string | Date;
  trackingCode: string;
  creatives?: Creative[];
}

function TrackPageContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(
    null
  );

  const fetchStatus = useCallback(async (trackingCode: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/track?code=${trackingCode}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch status");
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl && codeFromUrl.length === 8) {
      setCode(codeFromUrl);
      fetchStatus(codeFromUrl);
    }
  }, [searchParams, fetchStatus]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 8) return;
    fetchStatus(code.trim());
  };

  const renderPreviewContent = (creative: Creative) => {
    const type = creative.type.toLowerCase();

    if (type.startsWith("image/")) {
      return (
        <div className="relative w-full h-[60vh] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creative.url}
            alt={creative.name}
            className="object-contain max-w-full max-h-full"
          />
        </div>
      );
    }

    if (type.startsWith("video/")) {
      return (
        <div className="relative w-full h-[60vh] flex items-center justify-center bg-black rounded-lg overflow-hidden">
          <video
            src={creative.url}
            controls
            className="max-w-full max-h-full"
            autoPlay
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg p-8 text-center">
        <FileType className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-900 font-medium text-lg mb-2">
          Preview not available
        </p>
        <p className="text-gray-500 mb-6">
          This file type cannot be previewed directly.
        </p>
        <Button asChild>
          <a
            href={creative.url}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="w-4 h-4 mr-2" />
            Download File
          </a>
        </Button>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen py-4 px-4"
      style={{
        backgroundImage: `url(${Constants.background})`,
        backgroundColor: "var(--color-primary-50)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-4 md:mb-8">
          <Image
            src={Constants.logo}
            alt="logo"
            width={100}
            height={100}
            className="w-40 md:w-60 h-10 md:h-20"
          />
        </div>

        <Card className="shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Track Creative
            </CardTitle>
            <CardDescription className="text-gray-500">
              Track your creative using tracking ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-4 max-w-sm mx-auto mb-8"
            >
              <Input
                placeholder="Enter 8-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="text-left px-4 h-12 text-base"
              />
              <Button
                type="submit"
                disabled={isLoading || code.length !== 8}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                Track Now
              </Button>
            </form>

            <Separator className="mb-8" />

            {error ? (
              <div className="text-center text-red-500 py-8 bg-red-50 rounded-lg">
                <p className="font-medium">{error.message}</p>
                <p className="text-sm mt-1">
                  Please check your code and try again.
                </p>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Submission Found: {data.offerName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Submitted on{" "}
                    {new Date(data.submittedAt).toLocaleDateString()}
                  </p>
                </div>

                <StatusTracker
                  statuses={mapStatusToTracker(
                    data.status,
                    data.approvalStage,
                    data.adminStatus
                  )}
                />

                <div className="bg-gray-50 p-4 rounded-lg mt-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">
                    Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-gray-500">Status:</dt>
                    <dd className="col-span-1 font-medium capitalize">
                      {data.status}
                    </dd>

                    <dt className="text-gray-500">Approval Stage:</dt>
                    <dd className="col-span-1 font-medium capitalize">
                      {data.approvalStage}
                    </dd>

                    <dt className="text-gray-500">Admin Review:</dt>
                    <dd className="col-span-1 font-medium capitalize">
                      {data.adminStatus}
                    </dd>

                    {data.adminComments && (
                      <>
                        <dt className="text-gray-500">Admin Comments:</dt>
                        <dd className="col-span-1">{data.adminComments}</dd>
                      </>
                    )}
                  </dl>
                </div>

                {data.creatives && data.creatives.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-medium text-sm text-gray-900 mb-4">
                      Submitted Creatives
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.creatives.map((creative) => (
                        <button
                          key={creative.id}
                          onClick={() => setSelectedCreative(creative)}
                          className="flex items-center w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group"
                        >
                          <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-md group-hover:bg-blue-50 transition-colors relative overflow-hidden flex items-center justify-center">
                            {creative.type
                              .toLowerCase()
                              .startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={creative.url}
                                alt={creative.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileCheck className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
                            )}

                            {creative.type
                              .toLowerCase()
                              .startsWith("video/") && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Play className="w-3 h-3 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3 overflow-hidden flex-1">
                            <p
                              className="text-sm font-medium text-gray-800 truncate"
                              title={creative.name}
                            >
                              {creative.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {creative.type.split("/")[1]?.toUpperCase() ||
                                "FILE"}{" "}
                              • {(creative.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                Enter a code above to see results
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={!!selectedCreative}
          onOpenChange={(open) => !open && setSelectedCreative(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">
                {selectedCreative?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-1 text-center">
              {selectedCreative && renderPreviewContent(selectedCreative)}
            </div>
            {selectedCreative && (
              <div className="flex justify-end pt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCreative(null)}
                >
                  Close
                </Button>
                <Button asChild>
                  <a
                    href={selectedCreative.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}

function mapStatusToTracker(
  status: string,
  approvalStage: string,
  adminStatus: string
) {
  let activeStepId = 1;

  if (status !== "new") activeStepId = 2;

  if (adminStatus === "approved" || adminStatus === "rejected")
    activeStepId = 3;
  if (approvalStage === "completed") activeStepId = 5;

  return [
    {
      id: 1,
      title: "Submitted",
      description: "Case opened",
      icon: ArrowUpCircle,
      status: (activeStepId >= 1 ? "active" : "pending") as
        | "active"
        | "pending",
      color: (activeStepId >= 1 ? "blue" : "gray") as "blue" | "gray",
    },
    {
      id: 2,
      title: "Under Review",
      description: "Client reviewing",
      icon: Eye,
      status: (activeStepId >= 2 ? "active" : "pending") as
        | "active"
        | "pending",
      color: (activeStepId >= 2 ? "blue" : "gray") as "blue" | "gray",
    },
    {
      id: 3,
      title: "Decision Made",
      description: "Client decided",
      icon: MessageSquare,
      status: (activeStepId >= 3 ? "active" : "pending") as
        | "active"
        | "pending",
      color: (activeStepId >= 3 ? "blue" : "gray") as "blue" | "gray",
    },
    {
      id: 4,
      title: "Final Verdict",
      description: "Decision final",
      icon: UserCheck,
      status: (activeStepId >= 4 ? "active" : "pending") as
        | "active"
        | "pending",
      color: (activeStepId >= 4 ? "blue" : "gray") as "blue" | "gray",
    },
    {
      id: 5,
      title: "Completed",
      description: "Case closed",
      icon: FileCheck,
      status: (activeStepId >= 5 ? "active" : "pending") as
        | "active"
        | "pending",
      color: (activeStepId >= 5 ? "blue" : "gray") as "blue" | "gray",
    },
  ];
}
