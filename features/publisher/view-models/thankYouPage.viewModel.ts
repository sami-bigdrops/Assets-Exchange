import {
  File,
  FileArchive,
  PencilLine,
  ArrowUpCircle,
  Eye,
  MessageSquare,
  UserCheck,
  FileCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

export type SubmissionType = "single" | "multiple" | "fromSubjectLines" | null;

export interface StatusItem {
  id: number;
  title: string;
  description: string;
  icon: typeof ArrowUpCircle;
  status: "active" | "pending";
  color: "blue" | "gray" | "amber" | "cyan" | "green" | "red";
}

export interface SubmissionInfo {
  title: string;
  description: string;
  icon: typeof File;
  iconBg: string;
  iconColor: string;
}

export const useThankYouPage = () => {
  const searchParams = useSearchParams();
  const [submissionType, setSubmissionType] = useState<SubmissionType>(null);
  const [fileCount, setFileCount] = useState<number>(0);

  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    // Get submission type from URL parameters
    const type = searchParams.get("type") as SubmissionType;
    const count = searchParams.get("count")
      ? parseInt(searchParams.get("count")!)
      : 0;
    const code = searchParams.get("trackingCode");

    if (code) {
      setTrackingCode(code);
    }

    // If no URL params, try to get from localStorage (fallback)
    if (!type) {
      const storedType = localStorage.getItem(
        "creativeSubmissionType"
      ) as SubmissionType;
      const storedCount = localStorage.getItem("creativeFileCount");
      setSubmissionType(storedType || "single");
      setFileCount(storedCount ? parseInt(storedCount) : 1);
    } else {
      setSubmissionType(type);
      setFileCount(count || (type === "multiple" ? 5 : 1));
    }
  }, [searchParams]);

  const statuses: StatusItem[] = useMemo(
    () => [
      {
        id: 1,
        title: "Submitted",
        description: "Case opened",
        icon: ArrowUpCircle,
        status: "active",
        color: "blue",
      },
      {
        id: 2,
        title: "Under Review",
        description: "Client reviewing",
        icon: Eye,
        status: "pending",
        color: "gray",
      },
      {
        id: 3,
        title: "Decision Made",
        description: "Client decided",
        icon: MessageSquare,
        status: "pending",
        color: "gray",
      },
      {
        id: 4,
        title: "Final Verdict",
        description: "Decision final",
        icon: UserCheck,
        status: "pending",
        color: "gray",
      },
      {
        id: 5,
        title: "Completed",
        description: "Case closed",
        icon: FileCheck,
        status: "pending",
        color: "gray",
      },
    ],
    []
  );

  const submissionInfo: SubmissionInfo = useMemo(() => {
    if (submissionType === "multiple") {
      return {
        title: "Thank You for Your Multiple Creative Submission!",
        description: `Your ${fileCount} creative files have been successfully submitted and are now under review by our team.`,
        icon: FileArchive,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
      };
    } else if (submissionType === "single") {
      return {
        title: "Thank You for Your Creative Submission!",
        description:
          "Your creative has been successfully submitted and is now under review by our team.",
        icon: File,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
      };
    } else {
      return {
        title: "Thank You for From & Subject Lines Submission!",
        description:
          "Your from & subject lines have been successfully submitted and are now under review by our team.",
        icon: PencilLine,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
      };
    }
  }, [submissionType, fileCount]);

  const handleBackToHome = () => {
    window.location.href = "/";
  };

  const handleContactSupport = () => {
    window.open("mailto:support@example.com", "_blank");
  };

  return {
    submissionType,
    fileCount,
    trackingCode,
    statuses,
    submissionInfo,
    handleBackToHome,
    handleContactSupport,
  };
};
