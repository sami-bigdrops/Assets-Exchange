"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EntityDataTableColumn {
  header: string;
  width?: string;
}

interface EntityDataTableProps<T> {
  data: T[];
  columns: EntityDataTableColumn[];
  renderRow: (item: T, index: number) => React.ReactNode;
}

export function EntityDataTable<T>({
  data,
  columns,
  renderRow,
}: EntityDataTableProps<T>) {
  return (
    <div className="w-full">
      <div className="bg-[#3B9FD5] rounded-t-2xl px-6 py-4">
        <div
          className="grid gap-6 items-center justify-center text-center"
          style={{
            gridTemplateColumns: columns
              .map((col) => col.width || "1fr")
              .join(" "),
          }}
        >
          {columns.map((column, index) => (
            <div
              key={index}
              className="text-white font-inter font-medium text-base"
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3.5 mt-3">
        {data.map((item, index) => (
          <div key={index}>{renderRow(item, index)}</div>
        ))}
      </div>
    </div>
  );
}

interface EntityDataCardProps {
  id: string;
  name: string;
  platform: string;
  createdMethod: string;
  status: "Active" | "Inactive";
  variant?: "purple" | "blue";
  onEditDetails?: () => void;
  onBrandGuidelines?: () => void;
}

export function EntityDataCard({
  id,
  name,
  platform,
  createdMethod,
  status,
  variant = "purple",
  onEditDetails,
  onBrandGuidelines,
}: EntityDataCardProps) {
  const isPurple = variant === "purple";
  const backgroundColor = isPurple ? "#F9F7FF" : "#F1F9FF";
  const borderColor = isPurple ? "#9B81D1" : "#7C90CF";

  return (
    <div
      className="rounded-2xl border px-6 py-5 shadow-sm"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <div className="grid grid-cols-[100px_1.2fr_1.2fr_1.2fr_140px_200px] gap-6 items-start ">
        <div className="text-[#374151] font-inter text-center text-base">
          {id}
        </div>

        <div className="text-[#374151] font-inter text-center text-base">
          {name}
        </div>

        <div className="text-[#374151] font-inter text-center text-base">
          {platform}
        </div>

        <div className="text-[#374151] font-inter text-center text-base">
          {createdMethod}
        </div>

        <div className="flex justify-center items-center">
          <Badge
            className={`
              h-9 w-28 p-0
              text-sm font-medium 
              rounded-[20px]
              border border-[#86EFAC] 
              bg-[#E0FCE2] 
              text-[#267A46]
            `}
          >
            {status}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 items-center justify-self-end">
          <Button
            variant="outline"
            className="h-11.5 w-42 font-inter text-base font-medium text-[#2563EB] rounded-[6px] border border-[#2563EB] bg-[#F3F6FF] shadow-[0_2px_4px_0_rgba(30,64,175,0.15)] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            onClick={onEditDetails}
          >
            Edit Details
          </Button>
          <Button
            className="h-11.5 w-42 font-inter text-base font-medium text-[#EFF8FF] rounded-[6px] border-0 bg-[#3B82F6] hover:bg-[#1D4ED8] shadow-[0_2px_4px_0_rgba(30,64,175,0.15)]"
            onClick={onBrandGuidelines}
          >
            Brand Guidelines
          </Button>
        </div>
      </div>
    </div>
  );
}
