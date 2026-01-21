import { useState, useEffect, useCallback } from "react";

export type UploadType = "single" | "multiple";

interface UseFileUploadModalProps {
    isOpen: boolean;
    uploadType: UploadType;
    onFileUpload: (file: File) => Promise<void> | void;
    onClose: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

const getConfig = (uploadType: UploadType) => {
    if (uploadType === "single") {
        return {
            ALLOWED_TYPES: [".html", ".htm", ".zip", ".png", ".jpg", ".jpeg"],
            MAX_SIZE_MB: 50,
            ACCEPT_EXTENSIONS: ".html,.htm,.zip,.png,.jpg,.jpeg",
            PLACEHOLDER: "Drag and drop a single creative file (HTML, Image, or ZIP)",
            REQUIREMENTS: [
                "File must be HTML, PNG, JPG, JPEG, or ZIP format",
                "Maximum file size: 50MB",
                "ZIP files will be automatically detected",
            ],
        };
    } else {
        return {
            ALLOWED_TYPES: [".zip"],
            MAX_SIZE_MB: 100,
            ACCEPT_EXTENSIONS: ".zip",
            PLACEHOLDER: "Drag and drop a ZIP file containing multiple creatives",
            REQUIREMENTS: [
                "File must be a ZIP archive",
                "Maximum file size: 50MB",
                "Each HTML file in the ZIP will be treated as a separate creative",
            ],
        };
    }
};

export const useFileUploadModal = ({
    isOpen,
    uploadType,
    onFileUpload,
    onClose,
}: UseFileUploadModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<
        "idle" | "uploading" | "success" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const config = getConfig(uploadType);

    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen]);

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setDragActive(false);
        setUploadStatus("idle");
        setErrorMessage("");
        setUploadProgress(0);
    }, []);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const maxSizeBytes = config.MAX_SIZE_MB * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            return {
                valid: false,
                error: `File size exceeds maximum of ${config.MAX_SIZE_MB}MB`,
            };
        }

        const fileName = file.name.toLowerCase();
        
        const isValidExtension = config.ALLOWED_TYPES.some((ext) =>
            fileName.endsWith(ext.toLowerCase())
        );

        if (!isValidExtension) {
            return {
                valid: false,
                error: `File type not allowed. Allowed types: ${config.ALLOWED_TYPES.join(", ")}`,
            };
        }

        return { valid: true };
    };

    const handleFileSelect = useCallback(
        async (file: File) => {
            const validation = validateFile(file);
            if (!validation.valid) {
                setErrorMessage(validation.error || "Invalid file");
                setUploadStatus("error");
                return;
            }

            setSelectedFile(file);
            setErrorMessage("");
            setUploadStatus("idle");

            try {
                setUploadStatus("uploading");
                setUploadProgress(0);

                await onFileUpload(file);

                setUploadStatus("success");
                setUploadProgress(100);

                setTimeout(() => {
                    resetState();
                    onClose();
                }, 1500);
            } catch (error) {
                setUploadStatus("error");
                setErrorMessage(
                    error instanceof Error ? error.message : "Upload failed"
                );
            }
        },
        [onFileUpload, onClose, resetState]
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        },
        [handleFileSelect]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        },
        [handleFileSelect]
    );

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    return {
        selectedFile,
        dragActive,
        uploadStatus,
        errorMessage,
        uploadProgress,
        config,
        formatFileSize,
        handleDrag,
        handleDrop,
        handleFileInput,
        handleClose,
        resetState,
    };
};

