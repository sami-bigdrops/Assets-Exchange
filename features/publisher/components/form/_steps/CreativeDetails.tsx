"use client";

import { File, FileArchive, PencilLine, Search } from "lucide-react";
import { useState, useEffect } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type CreativeDetailsProps } from "@/features/publisher/types/form.types";

import FileUploadModal from "../_modals/FileUploadModal";
import FromSubjectLinesModal from "../_modals/FromSubjectLinesModal";
import MultipleCreativesModal from "../_modals/MultipleCreativesModal";
import SingleCreativeViewModal from "../_modals/SingleCreativeViewModal";

type UploadedFileMeta = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  source?: "single" | "zip";
  html?: boolean;
  previewUrl?: string;
  assetCount?: number;
  hasAssets?: boolean;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const creativeTypeOptions = [
  { label: "Email", value: "email" },
  { label: "Display", value: "display" },
  { label: "Search", value: "search" },
  { label: "Social", value: "social" },
  { label: "Native", value: "native" },
  { label: "Push", value: "push" },
];

const priorityLevels = [
  { name: "High", value: "high" },
  { name: "Medium", value: "medium" },
];

const CreativeDetails: React.FC<CreativeDetailsProps> = ({
  formData,
  onDataChange,
  validation,
}) => {
  const variables = getVariables();
  const [offerSearchTerm, setOfferSearchTerm] = useState("");
  const [offerOptions, setOfferOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/offers", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const offerData = await res.json();
        if (!isMounted) return;
        const offers = offerData.map(
          (offer: { id: string; offerId: string }) => ({
            label: offer.offerId,
            value: offer.id,
          })
        );
        setOfferOptions(offers);
        setIsLoadingOffers(false);
      } catch (e) {
        console.error("Failed to fetch offers:", e);
        if (!isMounted) return;
        setOfferOptions([]);
        setIsLoadingOffers(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState<
    "single" | "multiple"
  >("single");
  const [isFromSubjectLinesDialogOpen, setIsFromSubjectLinesDialogOpen] =
    useState(false);
  const [isSingleCreativeDialogOpen, setIsSingleCreativeDialogOpen] =
    useState(false);
  const [isMultipleCreativeDialogOpen, setIsMultipleCreativeDialogOpen] =
    useState(false);

  const [hasFromSubjectLines, setHasFromSubjectLines] = useState(false);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [_uploading, setUploading] = useState(false);
  const [selectedCreative, setSelectedCreative] =
    useState<UploadedFileMeta | null>(null);
  const [selectedCreatives, setSelectedCreatives] = useState<
    UploadedFileMeta[]
  >([]);
  const [uploadedZipFileName, setUploadedZipFileName] = useState<string>("");

  useEffect(() => {
    const hasFiles = uploadedFiles.length > 0;
    const hasLines = !!(formData.fromLines && formData.subjectLines);
    setHasUploadedFiles(hasFiles);
    setHasFromSubjectLines(hasLines);
    validation.updateFileUploadState(hasFiles);
    validation.updateFromSubjectLinesState(hasLines);
  }, [uploadedFiles, formData.fromLines, formData.subjectLines, validation]);

  const handleSelectChange = (fieldName: string, value: string) => {
    onDataChange({ [fieldName]: value });
    validation.handleFieldChange(fieldName as keyof typeof formData, value);
    if (fieldName === "offerId") {
      setOfferSearchTerm("");
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onDataChange({ [name]: value });
  };

  const handlePriorityChange = (priority: string) => {
    onDataChange({ priority });
  };

  const addFiles = (files: UploadedFileMeta[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const _removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const makeThumb = (file: File): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!file.type.startsWith("image/")) return resolve(undefined);
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.readAsDataURL(file);
    });

  const handleSingleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      let r: Response;

      if (
        file.type === "application/zip" ||
        file.name.toLowerCase().endsWith(".zip")
      ) {
        const url = new URL("/api/upload", window.location.href);
        url.searchParams.set("smartDetection", "true");
        url.searchParams.set("filename", encodeURIComponent(file.name));

        r = await fetch(url.toString(), {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        r = await fetch("/api/upload", { method: "POST", body: fd });
      }
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      if (data.zipAnalysis) {
        if (data.zipAnalysis.isSingleCreative) {
          const mainFile = data.zipAnalysis.mainCreative;
          const uploadedFile: UploadedFileMeta = {
            id: mainFile.fileId,
            name: mainFile.fileName,
            url: mainFile.fileUrl,
            size: mainFile.fileSize,
            type: mainFile.fileType || "text/html",
            source: "single",
            html: /\.html?$/i.test(mainFile.fileName),
            previewUrl: mainFile.previewUrl,
            assetCount: data.zipAnalysis.assetCount,
            hasAssets: data.zipAnalysis.assetCount > 0,
          };
          addFiles([uploadedFile]);
          setSelectedCreative(uploadedFile);
          setIsUploadDialogOpen(false);
          setIsSingleCreativeDialogOpen(true);
          return;
        } else {
          await handleMultipleFileUpload(file);
          return;
        }
      }

      const uploaded = data.file;
      if (!uploaded) {
        throw new Error("Upload response missing file data");
      }

      const previewUrl = await makeThumb(file);
      const uploadedFile: UploadedFileMeta = {
        id: uploaded.fileId,
        name: uploaded.fileName,
        url: uploaded.fileUrl,
        size: uploaded.fileSize,
        type: uploaded.fileType || file.type || "application/octet-stream",
        source: "single",
        html: /\.html?$/i.test(uploaded.fileName),
        previewUrl:
          previewUrl ||
          (/\.(png|jpe?g|gif|webp)$/i.test(uploaded.fileName)
            ? uploaded.fileUrl
            : undefined),
      };

      addFiles([uploadedFile]);
      setSelectedCreative(uploadedFile);
      setIsUploadDialogOpen(false);
      setIsSingleCreativeDialogOpen(true);
    } catch (e: unknown) {
      console.error("Upload failed:", e);
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleFileUpload = async (file: File) => {
    try {
      setUploading(true);

      const url = new URL("/api/upload", window.location.href);
      url.searchParams.set("smartDetection", "true");
      url.searchParams.set("filename", encodeURIComponent(file.name));

      const r = await fetch(url.toString(), {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      const zipItems = data.zipAnalysis?.items || [];

      if (zipItems.length === 0) {
        throw new Error("No files found in ZIP archive");
      }

      const mapped: UploadedFileMeta[] = zipItems.map(
        (f: {
          id: string;
          name: string;
          url: string;
          size: number;
          type?: string;
          isDependency?: boolean;
        }) => {
          const isImageFile = /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);
          return {
            id: f.id,
            name: f.name,
            url: f.url,
            size: f.size,
            type: f.type || "application/octet-stream",
            source: "zip",
            html: /\.html?$/i.test(f.name),
            previewUrl: isImageFile ? f.url : undefined,
          };
        }
      );

      addFiles(mapped);
      setSelectedCreatives(mapped);
      setUploadedZipFileName(file.name);
      setIsUploadDialogOpen(false);
      setIsMultipleCreativeDialogOpen(true);
    } catch (e: unknown) {
      console.error("ZIP extraction failed:", e);
      alert(e instanceof Error ? e.message : "ZIP extraction failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFromSubjectLinesSave = (
    fromLines: string,
    subjectLines: string
  ) => {
    onDataChange({ fromLines, subjectLines });
    validation.handleFieldChange("fromLines", fromLines);
    validation.handleFieldChange("subjectLines", subjectLines);
    setHasFromSubjectLines(true);
    setIsFromSubjectLinesDialogOpen(false);
  };

  const handleDeleteFromSubjectLines = () => {
    onDataChange({ fromLines: "", subjectLines: "" });
    setHasFromSubjectLines(false);
    validation.updateFromSubjectLinesState(false);
    validation.handleFieldChange("fromLines", "");
    validation.handleFieldChange("subjectLines", "");
  };

  const handleDeleteUploadedFiles = () => {
    setUploadedFiles([]);
    setHasUploadedFiles(false);
    setUploadedZipFileName("");
    validation.updateFileUploadState(false);
  };

  const handleViewUploadedFiles = () => {
    if (uploadedFiles.length === 1) {
      setSelectedCreative(uploadedFiles[0]);
      setIsSingleCreativeDialogOpen(true);
    } else if (uploadedFiles.length > 1) {
      setSelectedCreatives(uploadedFiles);
      setIsMultipleCreativeDialogOpen(true);
    }
  };

  const handleRemoveCreative = (creativeId: string) => {
    setSelectedCreatives((prev) =>
      prev.filter((creative) => creative.id !== creativeId)
    );
    setUploadedFiles((prev) => prev.filter((file) => file.id !== creativeId));
  };

  const filteredOfferOptions = offerOptions.filter((option) =>
    option.label.toLowerCase().includes(offerSearchTerm.toLowerCase())
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                        .creative-upload-button:hover {
                            border-color: ${variables.colors.titleColor} !important;
                            background-color: ${variables.colors.background} !important;
                        }
                        .creative-upload-button:hover svg {
                            color: ${variables.colors.titleColor} !important;
                        }
                        .creative-upload-button:hover span {
                            color: ${variables.colors.titleColor} !important;
                        }
                        .publisher-form-input:focus-visible,
                        textarea.publisher-form-input:focus-visible {
                            outline: none !important;
                            border-color: ${variables.colors.inputRingColor} !important;
                            box-shadow: 0 0 0 3px ${variables.colors.inputRingColor}50 !important;
                        }
                        .publisher-form-input:-webkit-autofill,
                        .publisher-form-input:-webkit-autofill:hover,
                        .publisher-form-input:-webkit-autofill:focus,
                        .publisher-form-input:-webkit-autofill:active,
                        textarea.publisher-form-input:-webkit-autofill,
                        textarea.publisher-form-input:-webkit-autofill:hover,
                        textarea.publisher-form-input:-webkit-autofill:focus,
                        textarea.publisher-form-input:-webkit-autofill:active {
                            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
                            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
                            box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
                            background-color: ${variables.colors.inputBackgroundColor} !important;
                            color: ${variables.colors.inputTextColor} !important;
                        }
                        .publisher-form-input::selection,
                        textarea.publisher-form-input::selection {
                            background-color: ${variables.colors.inputRingColor}40 !important;
                            color: ${variables.colors.inputTextColor} !important;
                        }
                        .publisher-form-input::-moz-selection,
                        textarea.publisher-form-input::-moz-selection {
                            background-color: ${variables.colors.inputRingColor}40 !important;
                            color: ${variables.colors.inputTextColor} !important;
                        }
                    `,
        }}
      />
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="offerId" className="font-inter text-sm">
              Offer ID <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.offerId}
              onValueChange={(value) => handleSelectChange("offerId", value)}
              onOpenChange={(open) => {
                if (open) {
                  setOfferSearchTerm("");
                } else {
                  validation.handleFieldBlur("offerId");
                }
              }}
            >
              <SelectTrigger
                className="w-full h-12! font-inter publisher-form-input"
                style={{
                  borderColor:
                    validation.hasFieldError("offerId") &&
                    validation.isFieldTouched("offerId")
                      ? variables.colors.inputErrorColor
                      : variables.colors.inputBorderColor,
                }}
              >
                <SelectValue placeholder="Select an offer" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search offers..."
                      value={offerSearchTerm}
                      onChange={(e) => setOfferSearchTerm(e.target.value)}
                      className="pl-10 h-12 text-sm"
                    />
                  </div>
                </div>
                {filteredOfferOptions.length > 0 ? (
                  filteredOfferOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="h-12!"
                    >
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    {offerSearchTerm
                      ? "No offers found"
                      : isLoadingOffers
                        ? "Loading offers..."
                        : "No offers available"}
                  </div>
                )}
              </SelectContent>
            </Select>
            {validation.hasFieldError("offerId") &&
              validation.isFieldTouched("offerId") && (
                <p
                  className="text-xs font-inter"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("offerId")}
                </p>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="creativeType" className="font-inter text-sm">
              Creative Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.creativeType}
              onValueChange={(value) =>
                handleSelectChange("creativeType", value)
              }
              onOpenChange={(open) => {
                if (!open) {
                  validation.handleFieldBlur("creativeType");
                }
              }}
            >
              <SelectTrigger
                className="w-full h-12! font-inter publisher-form-input"
                style={{
                  borderColor:
                    validation.hasFieldError("creativeType") &&
                    validation.isFieldTouched("creativeType")
                      ? variables.colors.inputErrorColor
                      : variables.colors.inputBorderColor,
                }}
              >
                <SelectValue placeholder="Select creative type" />
              </SelectTrigger>
              <SelectContent>
                {creativeTypeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="h-12!"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation.hasFieldError("creativeType") &&
              validation.isFieldTouched("creativeType") && (
                <p
                  className="text-xs font-inter"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("creativeType")}
                </p>
              )}
            {!hasUploadedFiles && validation.hasFieldError("creativeType") && (
              <p
                className="text-xs font-inter"
                style={{ color: variables.colors.inputErrorColor }}
              >
                Please upload at least one creative file
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-medium font-inter">
            {hasFromSubjectLines
              ? "Uploaded From & Subject Lines"
              : hasUploadedFiles
                ? "Uploaded Files"
                : "Upload Creatives"}
          </Label>

          {hasFromSubjectLines ? (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PencilLine className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">
                      From & Subject Lines Uploaded
                    </p>
                    <p className="text-sm text-green-600">
                      {formData.fromLines.split("\n").length} from lines •{" "}
                      {formData.subjectLines.split("\n").length} subject lines
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFromSubjectLinesDialogOpen(true)}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteFromSubjectLines}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : hasUploadedFiles ? (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {uploadedZipFileName ? (
                    <FileArchive className="h-5 w-5 text-green-600" />
                  ) : (
                    <File className="h-5 w-5 text-green-600" />
                  )}
                  <div>
                    <p className="font-medium text-green-800">
                      {uploadedFiles.length === 1
                        ? uploadedFiles[0].name
                        : uploadedZipFileName ||
                          `${uploadedFiles.length} Files Uploaded`}
                    </p>
                    <p className="text-sm text-green-600">
                      {uploadedFiles.length} file
                      {uploadedFiles.length !== 1 ? "s" : ""} •{" "}
                      {formatFileSize(
                        uploadedFiles.reduce(
                          (total, file) => total + file.size,
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewUploadedFiles}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteUploadedFiles}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                formData.creativeType === "email"
                  ? "grid-cols-1 md:grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              <Button
                variant="outline"
                className="creative-upload-button h-20 flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed transition-all"
                onClick={() => {
                  setCurrentUploadType("single");
                  setIsUploadDialogOpen(true);
                }}
              >
                <File
                  className="size-4"
                  style={{
                    color: variables.colors.titleColor,
                  }}
                />
                <span className="text-sm font-medium">Single Creative</span>
              </Button>

              <Button
                variant="outline"
                className="creative-upload-button h-20 flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed transition-all"
                onClick={() => {
                  setCurrentUploadType("multiple");
                  setIsUploadDialogOpen(true);
                }}
              >
                <FileArchive
                  className="size-4"
                  style={{
                    color: variables.colors.titleColor,
                  }}
                />
                <span className="text-sm font-medium">Multiple Creatives</span>
              </Button>

              {formData.creativeType === "email" && (
                <Button
                  variant="outline"
                  className="creative-upload-button h-20 flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed transition-all"
                  onClick={() => setIsFromSubjectLinesDialogOpen(true)}
                >
                  <PencilLine
                    className="size-4"
                    style={{
                      color: variables.colors.titleColor,
                    }}
                  />
                  <span className="text-sm font-medium">
                    From & Subject Lines
                  </span>
                </Button>
              )}
            </div>
          )}
          {formData.creativeType === "email" &&
            !hasFromSubjectLines &&
            !hasUploadedFiles && (
              <div className="space-y-2 mt-2">
                {(validation.hasFieldError("fromLines") ||
                  validation.hasFieldError("subjectLines")) && (
                  <div className="space-y-1">
                    {validation.hasFieldError("fromLines") && (
                      <p
                        className="text-xs font-inter"
                        style={{ color: variables.colors.inputErrorColor }}
                      >
                        {validation.getFieldErrorMessage("fromLines")}
                      </p>
                    )}
                    {validation.hasFieldError("subjectLines") && (
                      <p
                        className="text-xs font-inter"
                        style={{ color: variables.colors.inputErrorColor }}
                      >
                        {validation.getFieldErrorMessage("subjectLines")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium font-inter">Set Priority</Label>
          <div
            className="flex rounded-lg p-1 w-fit shadow-sm"
            style={{
              backgroundColor: variables.colors.inputBackgroundColor,
              borderColor: variables.colors.inputBorderColor,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {priorityLevels.map((priority) => (
              <button
                key={priority.value}
                onClick={() => handlePriorityChange(priority.value)}
                className="px-6 py-2.5 rounded-md text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    formData.priority === priority.value
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "transparent",
                  color:
                    formData.priority === priority.value
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.descriptionColor,
                  boxShadow:
                    formData.priority === priority.value
                      ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (formData.priority !== priority.value) {
                    e.currentTarget.style.backgroundColor =
                      variables.colors.background;
                    e.currentTarget.style.color = variables.colors.titleColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (formData.priority !== priority.value) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color =
                      variables.colors.descriptionColor;
                  }
                }}
              >
                {priority.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="additionalNotes" className="font-inter text-sm">
              Additional Notes
            </Label>
            <Textarea
              id="additionalNotes"
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleTextareaChange}
              placeholder="Enter any additional notes..."
              rows={4}
              className="w-full font-inter publisher-form-input"
            />
          </div>
        </div>

        <FileUploadModal
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          uploadType={currentUploadType}
          onFileUpload={
            currentUploadType === "single"
              ? handleSingleFileUpload
              : handleMultipleFileUpload
          }
        />

        <FromSubjectLinesModal
          isOpen={isFromSubjectLinesDialogOpen}
          onClose={() => setIsFromSubjectLinesDialogOpen(false)}
          onSave={handleFromSubjectLinesSave}
          initialFromLines={formData.fromLines}
          initialSubjectLines={formData.subjectLines}
        />

        {selectedCreative && (
          <SingleCreativeViewModal
            isOpen={isSingleCreativeDialogOpen}
            onClose={() => {
              setIsSingleCreativeDialogOpen(false);
              setSelectedCreative(null);
            }}
            creative={{
              id: selectedCreative.id,
              name: selectedCreative.name,
              url: selectedCreative.url,
              size: selectedCreative.size,
              type: selectedCreative.type,
              previewUrl: selectedCreative.previewUrl,
              html: selectedCreative.html,
            }}
            onFileNameChange={(fileId, newFileName) => {
              setUploadedFiles((prev) =>
                prev.map((file) =>
                  file.id === fileId ? { ...file, name: newFileName } : file
                )
              );
              if (selectedCreative.id === fileId) {
                setSelectedCreative({ ...selectedCreative, name: newFileName });
              }
            }}
            showAdditionalNotes={false}
            creativeType={formData.creativeType}
          />
        )}

        {selectedCreatives.length > 0 && (
          <MultipleCreativesModal
            isOpen={isMultipleCreativeDialogOpen}
            onClose={() => setIsMultipleCreativeDialogOpen(false)}
            creatives={selectedCreatives}
            onRemoveCreative={handleRemoveCreative}
            uploadedZipFileName={uploadedZipFileName}
          />
        )}
      </div>
    </>
  );
};

export default CreativeDetails;
