"use client";

import {
  Loader2,
  ArrowUpCircle,
  Eye,
  MessageSquare,
  UserCheck,
  FileCheck,
  CheckCircle2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Undo2,
  Upload,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { toast } from "sonner";

import { Constants } from "@/app/Constants/Constants";
import { getVariables } from "@/components/_variables/variables";
import { Badge } from "@/components/ui/badge";
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
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import FileUploadModal from "@/features/publisher/components/form/_modals/FileUploadModal";
import MultipleCreativesModal from "@/features/publisher/components/form/_modals/MultipleCreativesModal";
import SingleCreativeViewModal from "@/features/publisher/components/form/_modals/SingleCreativeViewModal";
import { StatusTracker } from "@/features/publisher/components/thankYou/StatusTracker";
import type { CreativeFile } from "@/features/publisher/view-models/multipleCreativesModal.viewModel";
import type { Creative as SingleCreative } from "@/features/publisher/view-models/singleCreativeViewModal.viewModel";

interface Creative {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  metadata?: {
    fromLines?: string;
    subjectLines?: string;
    additionalNotes?: string;
  };
}

interface TrackingData {
  id: string;
  offerName: string;
  offerId: string;
  status: string;
  approvalStage: string;
  adminStatus: string;
  adminComments: string | null;
  submittedAt: string | Date;
  trackingCode: string;
  creatives?: Creative[];
  priority?: string;
  creativeType?: string;
  fromLinesCount?: number;
  subjectLinesCount?: number;
  fromLines?: string | null;
  subjectLines?: string | null;
  additionalNotes?: string | null;
}

const variables = getVariables();

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "new":
      return "rounded-[20px] border border-[#93C5FD] bg-[#DBEAFE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#1E40AF]";
    case "pending":
      return "rounded-[20px] border border-[#FCD34D] bg-[#FFF8DB] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#B18100]";
    case "approved":
      return "rounded-[20px] border border-[#86EFAC] bg-[#DCFCE7] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#15803D]";
    case "rejected":
      return "rounded-[20px] border border-[#FCA5A5] bg-[#FEE2E2] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#DC2626]";
    case "sent-back":
      return "rounded-[20px] border border-[#C4B5FD] bg-[#EDE9FE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#7C3AED]";
    case "revised":
      return "rounded-[20px] border border-[#67E8F9] bg-[#CFFAFE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#0891B2]";
    default:
      return "rounded-[20px] border border-[#D1D5DB] bg-[#F3F4F6] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#6B7280]";
  }
};

const getStatusLabel = (status: string, approvalStage: string) => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  if (normalizedStatus === "approved" && normalizedStage === "completed") {
    return "Fully Approved";
  }
  if (normalizedStatus === "approved" && normalizedStage === "admin") {
    return "Approved by Admin";
  }
  if (normalizedStatus === "new" && normalizedStage === "admin") {
    return "Pending Admin Review";
  }
  if (normalizedStatus === "pending" && normalizedStage === "admin") {
    return "Pending Admin Review";
  }
  if (normalizedStatus === "pending" && normalizedStage === "advertiser") {
    return "Forwarded to Advertiser";
  }
  if (normalizedStatus === "rejected" && normalizedStage === "admin") {
    return "Rejected by Admin";
  }
  if (normalizedStatus === "rejected" && normalizedStage === "advertiser") {
    return "Rejected by Advertiser";
  }
  if (normalizedStatus === "sent-back" && normalizedStage === "admin") {
    return "Sent Back to Publisher";
  }
  if (normalizedStatus === "sent-back" && normalizedStage === "advertiser") {
    return "Returned by Advertiser";
  }
  if (normalizedStatus === "revised" && normalizedStage === "admin") {
    return "Revised - Pending Admin Review";
  }

  switch (normalizedStatus) {
    case "new":
      return "New Submission";
    case "pending":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "sent-back":
      return "Sent Back";
    case "revised":
      return "Revised Submission";
    default:
      return status;
  }
};

const getPriorityBadgeClass = (priority: string) => {
  if (priority?.toLowerCase().includes("high")) {
    return "rounded-[20px] border border-[#FCA5A5] bg-[#FFDFDF] h-7 px-1.5 text-xs xl:text-sm font-inter text-[#D70000]";
  }
  if (priority?.toLowerCase().includes("medium")) {
    return "rounded-[20px] border border-[#FCD34D] bg-[#FFF8DB] h-7 px-1.5 text-xs xl:text-sm font-inter text-[#B18100]";
  }
  return "rounded-[20px] border border-[#93C5FD] bg-[#DBEAFE] h-7 px-1.5 text-xs xl:text-sm font-inter text-[#1E40AF]";
};

const getFileType = (
  fileName: string
): "image" | "html" | "video" | "other" => {
  const lowerName = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lowerName)) {
    return "image";
  }
  if (/\.(html|htm)$/i.test(lowerName)) {
    return "html";
  }
  if (/\.(mp4|webm|mov|avi)$/i.test(lowerName)) {
    return "video";
  }
  return "other";
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

function TrackPageContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(
    null
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);

  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // States for sent-back workflow with full modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isMultipleModalOpen, setIsMultipleModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [modalCreatives, setModalCreatives] = useState<CreativeFile[]>([]);
  const [singleCreative, setSingleCreative] = useState<SingleCreative | null>(
    null
  );

  // States for revision workflow (editing uploaded creative before submission)
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [pendingCreatives, setPendingCreatives] = useState<
    Array<{
      name: string;
      url: string;
      type: string;
      size: number;
    }>
  >([]);

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

  const handleViewCreative = async (
    creative: Creative,
    isSentBack: boolean = false
  ) => {
    const fileType = getFileType(creative.name);

    if (isSentBack && data) {
      // For sent-back status, open full modal with edit capabilities
      if (data.creatives && data.creatives.length > 1) {
        // Multiple creatives - open MultipleCreativesModal
        const creativesData: CreativeFile[] = data.creatives.map((c) => {
          const fType = getFileType(c.name);
          return {
            id: c.id,
            name: c.name,
            url: c.url,
            size: c.size,
            type: c.type,
            previewUrl: fType === "image" ? c.url : undefined,
            html: fType === "html",
            metadata: {
              fromLines: data.fromLines || "",
              subjectLines: data.subjectLines || "",
              additionalNotes: data.additionalNotes || "",
            },
          };
        });
        setModalCreatives(creativesData);
        setIsMultipleModalOpen(true);
      } else {
        // Single creative - open SingleCreativeViewModal
        const creativeData: SingleCreative = {
          id: creative.id,
          name: creative.name,
          url: creative.url,
          size: creative.size,
          type: creative.type,
          previewUrl: fileType === "image" ? creative.url : undefined,
          html: fileType === "html",
          metadata: {
            fromLines: data.fromLines || "",
            subjectLines: data.subjectLines || "",
            additionalNotes: data.additionalNotes || "",
          },
        };

        setSingleCreative(creativeData);
        setIsSingleModalOpen(true);
      }
    } else {
      // For normal status, open simple fullscreen preview
      setSelectedCreative(creative);

      if (fileType === "html") {
        setIsLoadingHtml(true);
        try {
          const response = await fetch(creative.url);
          const html = await response.text();
          setHtmlContent(html);
        } catch {
          setHtmlContent(
            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;color:#666;"><p>Failed to load HTML content</p></div>'
          );
        } finally {
          setIsLoadingHtml(false);
        }
      }

      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
      setIsFullscreenOpen(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreenOpen(false);
    setSelectedCreative(null);
    setHtmlContent("");
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => {
      const newZoom = Math.min(prev + 0.25, 1.5);
      // Reset position when zooming to prevent out-of-bounds
      if (newZoom !== prev) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 1);
      // Reset position when reaching 1x zoom
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const _handleResetZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: 0, y: e.clientY - imagePosition.y });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      const newY = e.clientY - dragStart.y;

      // Calculate bounds to keep image in viewport
      // When zoomed to 1.5x, the image is 50% larger, so we can pan by 25% in each direction
      const maxPan = (window.innerHeight * (imageZoom - 1)) / 2;
      const clampedY = Math.max(-maxPan, Math.min(maxPan, newY));

      setImagePosition({
        x: 0,
        y: clampedY,
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!data) return;

    if (isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload file to blob storage
      const formData = new FormData();
      formData.append("file", file);

      // Enable smart detection for ZIP files
      const isZipFile =
        file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip");
      if (isZipFile) {
        formData.append("smartDetection", "true");
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload file");
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Close upload modal
      setIsUploadModalOpen(false);

      // Check if it's a ZIP file with smart detection
      if (uploadResult.zipAnalysis) {
        // Handle multiple creatives from ZIP
        const creativeItems = uploadResult.zipAnalysis.items
          .filter((item: { isDependency: boolean }) => !item.isDependency)
          .map(
            (item: {
              id: string;
              name: string;
              url: string;
              type: string;
              size: number;
            }) => ({
              id: item.id || Date.now().toString(),
              name: item.name,
              url: item.url,
              type: item.type,
              size: item.size,
            })
          );

        if (creativeItems.length === 0) {
          throw new Error("No valid creatives found in ZIP file");
        }

        // Store pending creatives and open modal for editing
        setPendingCreatives(creativeItems);
        setIsRevisionMode(true);

        if (creativeItems.length === 1) {
          // Single creative from ZIP - open SingleCreativeViewModal
          const fileType = getFileType(creativeItems[0].name);
          const creativeData: SingleCreative = {
            id: creativeItems[0].id,
            name: creativeItems[0].name,
            url: creativeItems[0].url,
            size: creativeItems[0].size,
            type: creativeItems[0].type,
            previewUrl: fileType === "image" ? creativeItems[0].url : undefined,
            html: fileType === "html",
          };
          setSingleCreative(creativeData);
          setIsSingleModalOpen(true);
        } else {
          // Multiple creatives - open MultipleCreativesModal
          const creativesData: CreativeFile[] = creativeItems.map(
            (item: {
              id: string;
              name: string;
              url: string;
              type: string;
              size: number;
            }) => {
              const fType = getFileType(item.name);
              return {
                id: item.id,
                name: item.name,
                url: item.url,
                size: item.size,
                type: item.type,
                previewUrl: fType === "image" ? item.url : undefined,
                html: fType === "html",
              };
            }
          );
          setModalCreatives(creativesData);
          setIsMultipleModalOpen(true);
        }
      } else {
        // Handle single file upload
        const creativeItem = {
          id: uploadResult.file.fileId || Date.now().toString(),
          name: uploadResult.file.fileName,
          url: uploadResult.file.fileUrl,
          type: uploadResult.file.fileType,
          size: uploadResult.file.fileSize,
        };

        // Store pending creative and open modal for editing
        setPendingCreatives([creativeItem]);
        setIsRevisionMode(true);

        const fileType = getFileType(creativeItem.name);
        const creativeData: SingleCreative = {
          id: creativeItem.id,
          name: creativeItem.name,
          url: creativeItem.url,
          size: creativeItem.size,
          type: creativeItem.type,
          previewUrl: fileType === "image" ? creativeItem.url : undefined,
          html: fileType === "html",
        };
        setSingleCreative(creativeData);
        setIsSingleModalOpen(true);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload creative: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRevisionSubmit = async (metadata: {
    fromLines: string;
    subjectLines: string;
    additionalNotes: string;
  }) => {
    if (!data || pendingCreatives.length === 0) return;

    try {
      // Submit the revision with the new creatives
      const reviseResponse = await fetch("/api/creative-request/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: data.id,
          newCreatives: pendingCreatives,
          metadata: {
            fromLines: metadata.fromLines,
            subjectLines: metadata.subjectLines,
            additionalNotes: metadata.additionalNotes,
          },
        }),
      });

      if (!reviseResponse.ok) {
        const errorData = await reviseResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update creative request");
      }

      // Close modal and reset state
      setIsSingleModalOpen(false);
      setIsMultipleModalOpen(false);
      setSingleCreative(null);
      setModalCreatives([]);
      setPendingCreatives([]);
      setIsRevisionMode(false);

      // Refresh tracking data
      if (code) {
        await fetchStatus(code);
      }

      toast.success(
        "Creative revised successfully! Your request has been resubmitted for review."
      );
    } catch (error) {
      console.error("Revision submit error:", error);
      toast.error(
        `Failed to submit revision: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  };

  const handleRemoveCreative = (_id: string) => {
    // For read-only view in track page
  };

  const handleFileNameChange = (_fileId: string, _newFileName: string) => {
    // For sent-back, allow file name changes
  };

  const handleMetadataChange = (
    _fileId: string,
    _metadata: {
      fromLines?: string;
      subjectLines?: string;
      additionalNotes?: string;
    }
  ) => {
    // For sent-back, allow metadata changes
  };

  const handleFileUpdate = (_updates: {
    url?: string;
    metadata?: Record<string, unknown>;
  }) => {
    // Handle file updates after proofreading or edits
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
      <div className="max-w-6xl mx-auto">
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
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Track Your Creative
            </CardTitle>
            <CardDescription className="text-gray-500">
              Enter your 8-digit tracking code to view submission status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-lg mx-auto mb-6"
            >
              <Input
                placeholder="8-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 h-10 sm:h-10 text-sm font-inter tracking-[0.2em] text-center placeholder:tracking-normal placeholder:text-gray-400"
              />
              <Button
                type="submit"
                disabled={isLoading || code.length !== 8}
                className="h-10 px-6 bg-blue-500 hover:bg-blue-600 text-white text-sm font-inter font-medium rounded-md shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-4 w-4 sm:mr-1.5" />
                ) : null}
                Track
              </Button>
            </form>

            <Separator className="mb-6" />

            {error ? (
              <div className="text-center text-red-500 py-8 bg-red-50 rounded-lg">
                <p className="font-medium">{error.message}</p>
                <p className="text-sm mt-1">
                  Please check your code and try again.
                </p>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {data.offerName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Submitted on{" "}
                      {new Date(data.submittedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "America/Los_Angeles",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.priority && (
                      <Badge
                        variant="outline"
                        className={getPriorityBadgeClass(data.priority)}
                      >
                        {data.priority}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(data.status)}
                    >
                      {getStatusLabel(data.status, data.approvalStage)}
                    </Badge>
                  </div>
                </div>

                <StatusTracker
                  statuses={mapStatusToTracker(
                    data.status,
                    data.approvalStage,
                    data.adminStatus
                  )}
                />

                {data.adminComments &&
                  data.status.toLowerCase() === "sent-back" && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-medium text-sm text-amber-800 mb-2">
                        Admin Comments
                      </h4>
                      <p className="text-sm text-amber-700">
                        {data.adminComments}
                      </p>
                    </div>
                  )}

                {data.creatives && data.creatives.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-medium text-sm text-gray-900 mb-4">
                      Submitted Creatives ({data.creatives.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {data.creatives.map((creative) => {
                        const fileType = getFileType(creative.name);
                        return (
                          <div
                            key={creative.id}
                            className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300"
                          >
                            <div className="p-5">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200">
                                  {fileType === "image" ? (
                                    <ImageIcon className="h-6 w-6 text-blue-600" />
                                  ) : fileType === "html" ? (
                                    <FileText className="h-6 w-6 text-green-600" />
                                  ) : (
                                    <File className="h-6 w-6 text-gray-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5
                                    className="font-inter font-semibold text-gray-900 truncate text-base mb-1"
                                    title={creative.name}
                                  >
                                    {creative.name}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                      {creative.type
                                        ?.split("/")[1]
                                        ?.toUpperCase() || "FILE"}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                      {formatFileSize(creative.size)}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-6 font-inter text-sm font-medium rounded-md"
                                    style={{
                                      color:
                                        variables.colors
                                          .requestCardViewButtonTextColor,
                                      backgroundColor:
                                        variables.colors
                                          .requestCardViewButtonBackgroundColor,
                                      border: `1px solid ${variables.colors.requestCardViewButtonBorderColor}`,
                                    }}
                                    onClick={() =>
                                      handleViewCreative(
                                        creative,
                                        data.status.toLowerCase() ===
                                          "sent-back"
                                      )
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Creative
                                  </Button>
                                  {data.status.toLowerCase() ===
                                    "sent-back" && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-10 px-6 bg-amber-500 hover:bg-amber-600 text-white font-inter text-sm font-medium rounded-md"
                                      onClick={() => setIsUploadModalOpen(true)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Creative
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="border-t border-gray-100 pt-4">
                                <dl className="grid grid-cols-3 gap-3">
                                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-3 border border-blue-200">
                                    <dt className="text-xs font-medium text-blue-700 mb-1.5 font-inter uppercase tracking-wide">
                                      Creative Type
                                    </dt>
                                    <dd className="text-base font-bold text-blue-900 capitalize font-inter">
                                      {data.creativeType ?? "—"}
                                    </dd>
                                  </div>
                                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg px-3 py-3 border border-purple-200">
                                    <dt className="text-xs font-medium text-purple-700 mb-1.5 font-inter uppercase tracking-wide">
                                      From Lines
                                    </dt>
                                    <dd className="text-base font-bold text-purple-900 font-inter">
                                      {data.fromLinesCount ?? "—"}
                                    </dd>
                                  </div>
                                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-3 py-3 border border-green-200">
                                    <dt className="text-xs font-medium text-green-700 mb-1.5 font-inter uppercase tracking-wide">
                                      Subject Lines
                                    </dt>
                                    <dd className="text-base font-bold text-green-900 font-inter">
                                      {data.subjectLinesCount ?? "—"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                Enter your tracking code above to view your submission status
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCreative && (
        <Dialog
          open={isFullscreenOpen}
          onOpenChange={(open) => !open && handleCloseFullscreen()}
        >
          <DialogContent
            className="max-w-screen! max-h-screen! w-screen h-screen m-0 p-0 rounded-none bg-black/50 backdrop-blur-md"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">
              Fullscreen Preview - {selectedCreative.name}
            </DialogTitle>
            <div className="flex flex-col h-full w-full relative">
              <DialogHeader className="shrink-0 border-b border-gray-700 p-4 bg-black/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileType(selectedCreative.name) === "image" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleZoomOut}
                          disabled={imageZoom <= 1}
                          className="h-9 text-white hover:bg-white disabled:opacity-50"
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleZoomIn}
                          disabled={imageZoom >= 1.5}
                          className="h-9 text-white hover:bg-white disabled:opacity-50"
                          title="Zoom In"
                        >
                          <ZoomIn className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseFullscreen}
                    className="h-9 text-white hover:bg-white"
                    title="Close"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </Button>
                </div>
              </DialogHeader>

              <DialogBody className="flex-1 flex items-center justify-center overflow-hidden p-0 m-0 max-w-full! max-h-full!">
                {getFileType(selectedCreative.name) === "image" && (
                  <div
                    className="w-full h-full flex items-center justify-center overflow-hidden relative select-none"
                    style={{
                      cursor:
                        imageZoom > 1
                          ? isDragging
                            ? "grabbing"
                            : "grab"
                          : "default",
                      userSelect: "none",
                    }}
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUp}
                    onMouseLeave={handleImageMouseUp}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedCreative.url}
                      alt={selectedCreative.name}
                      className="max-w-full max-h-full object-contain select-none pointer-events-none"
                      style={{
                        transform: `scale(${imageZoom}) translateY(${imagePosition.y / imageZoom}px)`,
                        transformOrigin: "center center",
                        transition: isDragging
                          ? "none"
                          : "transform 0.2s ease-out",
                      }}
                      draggable={false}
                    />
                  </div>
                )}

                {getFileType(selectedCreative.name) === "html" && (
                  <div className="w-full h-full bg-white">
                    {isLoadingHtml ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <iframe
                        srcDoc={htmlContent}
                        title="HTML Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                )}

                {getFileType(selectedCreative.name) === "video" && (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <video
                      src={selectedCreative.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-full"
                    />
                  </div>
                )}

                {getFileType(selectedCreative.name) === "other" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center max-w-md">
                      <div className="p-4 bg-gray-800 rounded-full">
                        <File className="h-12 w-12 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">
                          Preview Not Available
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">
                          This file type cannot be previewed directly.
                        </p>
                        <Button
                          asChild
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <a
                            href={selectedCreative.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* File Upload Modal for Sent-Back status */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        uploadType={
          data && data.creatives && data.creatives.length > 1
            ? "multiple"
            : "single"
        }
        onFileUpload={handleFileUpload}
      />

      {/* Single Creative View Modal for Sent-Back status */}
      {singleCreative && (
        <SingleCreativeViewModal
          isOpen={isSingleModalOpen}
          onClose={() => {
            setIsSingleModalOpen(false);
            setSingleCreative(null);
            if (isRevisionMode) {
              setPendingCreatives([]);
              setIsRevisionMode(false);
            }
          }}
          creative={singleCreative}
          onFileNameChange={handleFileNameChange}
          onMetadataChange={handleMetadataChange}
          onFileUpdate={handleFileUpdate}
          showAdditionalNotes={true}
          creativeType={data?.creativeType ?? "email"}
          siblingCreatives={[]}
          viewOnly={!isRevisionMode}
          onSaveAndSubmit={isRevisionMode ? handleRevisionSubmit : undefined}
        />
      )}

      {/* Multiple Creatives Modal for Sent-Back status */}
      {modalCreatives.length > 0 && (
        <MultipleCreativesModal
          isOpen={isMultipleModalOpen}
          onClose={() => {
            setIsMultipleModalOpen(false);
            setModalCreatives([]);
            if (isRevisionMode) {
              setPendingCreatives([]);
              setIsRevisionMode(false);
            }
          }}
          creatives={modalCreatives}
          onRemoveCreative={handleRemoveCreative}
          onFileNameChange={handleFileNameChange}
          onMetadataChange={handleMetadataChange}
          creativeType={data?.creativeType ?? "email"}
          viewOnly={!isRevisionMode}
          onSaveAndSubmit={isRevisionMode ? handleRevisionSubmit : undefined}
        />
      )}
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
  _adminStatus: string
) {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();
  const isSentBack = normalizedStatus === "sent-back";
  const isRevised = normalizedStatus === "revised";
  const isApproved = normalizedStatus === "approved";
  const isRejected = normalizedStatus === "rejected";
  const isPending = normalizedStatus === "pending";
  const isForwardedToAdvertiser = isPending && normalizedStage === "advertiser";

  // Base statuses
  const baseStatuses = [
    {
      id: 1,
      title: "Submitted",
      description: "Case opened",
      icon: ArrowUpCircle,
      status: "active" as "active" | "pending",
      color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
    },
    {
      id: 2,
      title: "Under Review",
      description: "Admin reviewing",
      icon: Eye,
      status: "active" as "active" | "pending",
      color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
    },
    {
      id: 3,
      title: "Decision Made",
      description: "Admin decided",
      icon: MessageSquare,
      status: (isApproved ||
      isRejected ||
      isSentBack ||
      isRevised ||
      isForwardedToAdvertiser
        ? "active"
        : "pending") as "active" | "pending",
      color: (isApproved ||
      isRejected ||
      isSentBack ||
      isRevised ||
      isForwardedToAdvertiser
        ? "blue"
        : "gray") as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
    },
  ];

  // If approved by admin, show the approval flow with Completed
  if (isApproved && normalizedStage === "admin") {
    baseStatuses.push(
      {
        id: 4,
        title: "Approved by Admin",
        description: "Admin approved",
        icon: FileCheck,
        status: "active" as "active" | "pending",
        color: "green" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 5,
        title: "Completed",
        description: "Case closed",
        icon: CheckCircle2,
        status: "active" as "active" | "pending",
        color: "green" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      }
    );
  }

  // If forwarded to advertiser, show the forwarding flow
  if (isForwardedToAdvertiser) {
    baseStatuses.push(
      {
        id: 4,
        title: "Forwarded to Advertiser",
        description: "Admin approved, sent to advertiser",
        icon: FileCheck,
        status: "active" as "active" | "pending",
        color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 5,
        title: "Final Review",
        description: "Advertiser reviewing",
        icon: UserCheck,
        status: "active" as "active" | "pending",
        color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 6,
        title: "Completed",
        description: "Case closed",
        icon: CheckCircle2,
        status: "pending" as "active" | "pending",
        color: "gray" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      }
    );
  }

  // If rejected, show rejection status with Completed
  if (isRejected) {
    baseStatuses.push(
      {
        id: 4,
        title: "Rejected",
        description:
          normalizedStage === "admin"
            ? "Rejected by admin"
            : "Rejected by advertiser",
        icon: MessageSquare,
        status: "active" as "active" | "pending",
        color: "red" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 5,
        title: "Completed",
        description: "Case closed",
        icon: CheckCircle2,
        status: "active" as "active" | "pending",
        color: "red" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      }
    );
  }

  // If sent back, insert "Sent Back" status after "Decision Made"
  if (isSentBack) {
    baseStatuses.push({
      id: 4,
      title: "Sent Back",
      description: "Revision required",
      icon: Undo2,
      status: "active" as "active" | "pending",
      color: "amber" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
    });
  }

  // If revised, show the revision flow
  if (isRevised) {
    baseStatuses.push(
      {
        id: 4,
        title: "Sent Back",
        description: "Revision requested",
        icon: Undo2,
        status: "active" as "active" | "pending",
        color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 5,
        title: "Revised",
        description: "Resubmitted",
        icon: RefreshCw,
        status: "active" as "active" | "pending",
        color: "cyan" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      },
      {
        id: 6,
        title: "Re-Review",
        description: "Admin reviewing revision",
        icon: Eye,
        status: "active" as "active" | "pending",
        color: "cyan" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
      }
    );
  }

  // Add remaining statuses only if not rejected, not approved by admin, and not forwarded to advertiser
  if (
    !isRejected &&
    !(isApproved && normalizedStage === "admin") &&
    !isForwardedToAdvertiser
  ) {
    const nextId = isRevised ? 7 : isSentBack ? 5 : 4;

    // Show completed if fully approved
    if (isApproved && normalizedStage === "completed") {
      baseStatuses[2].status = "active";
      baseStatuses[2].color = "blue";
      baseStatuses.push(
        {
          id: 4,
          title: "Approved by Admin",
          description: "Admin approved",
          icon: FileCheck,
          status: "active" as "active" | "pending",
          color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
        },
        {
          id: 5,
          title: "Final Review",
          description: "Advertiser review",
          icon: UserCheck,
          status: "active" as "active" | "pending",
          color: "blue" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
        },
        {
          id: 6,
          title: "Completed",
          description: "Case closed",
          icon: CheckCircle2,
          status: "active" as "active" | "pending",
          color: "green" as
            | "blue"
            | "gray"
            | "amber"
            | "cyan"
            | "green"
            | "red",
        }
      );
    } else if (!isApproved) {
      baseStatuses.push(
        {
          id: nextId,
          title: "Final Review",
          description: "Advertiser review",
          icon: UserCheck,
          status: "pending" as "active" | "pending",
          color: "gray" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
        },
        {
          id: nextId + 1,
          title: "Completed",
          description: "Case closed",
          icon: CheckCircle2,
          status: "pending" as "active" | "pending",
          color: "gray" as "blue" | "gray" | "amber" | "cyan" | "green" | "red",
        }
      );
    }
  }

  return baseStatuses;
}
