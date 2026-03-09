"use server";

import {
  getRequestWithCreatives,
  type RequestCreativeRow,
} from "@/features/admin/services/request.service";

export type ViewCreative = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  previewUrl?: string;
  html?: boolean;
  metadata?: {
    fromLines?: string;
    subjectLines?: string;
    additionalNotes?: string;
  };
};

interface RequestMetadata {
  fromLines?: string;
  subjectLines?: string;
  additionalNotes?: string;
}

function rowToViewCreative(
  row: RequestCreativeRow,
  requestMetadata: RequestMetadata
): ViewCreative {
  const isImage =
    row.format === "image" ||
    /^image\//i.test(row.type) ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(row.name);
  const isHtml =
    row.format === "html" ||
    /html/i.test(row.type) ||
    /\.html?$/i.test(row.name);

  const metadata = {
    fromLines: (row.metadata?.fromLines as string) || requestMetadata.fromLines,
    subjectLines:
      (row.metadata?.subjectLines as string) || requestMetadata.subjectLines,
    additionalNotes:
      (row.metadata?.additionalNotes as string) ||
      requestMetadata.additionalNotes,
  };

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    size: row.size,
    type: row.type,
    previewUrl: isImage ? row.url : undefined,
    html: isHtml,
    metadata,
  };
}

export type RequestViewData =
  | { type: "single"; creative: ViewCreative; creativeType: string }
  | { type: "multiple"; creatives: ViewCreative[]; creativeType: string }
  | null;

export async function getRequestViewData(
  requestId: string
): Promise<RequestViewData> {
  const result = await getRequestWithCreatives(requestId);
  if (!result || result.creatives.length === 0) return null;

  const creativeType = result.request.creativeType ?? "email";

  const requestMetadata: RequestMetadata = {
    fromLines: result.request.fromLines ?? undefined,
    subjectLines: result.request.subjectLines ?? undefined,
    additionalNotes: result.request.additionalNotes ?? undefined,
  };

  const viewCreatives = result.creatives.map((row) =>
    rowToViewCreative(row, requestMetadata)
  );

  if (viewCreatives.length === 1) {
    return {
      type: "single",
      creative: viewCreatives[0],
      creativeType,
    };
  }

  return {
    type: "multiple",
    creatives: viewCreatives,
    creativeType,
  };
}
