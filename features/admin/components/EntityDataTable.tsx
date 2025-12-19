"use client";

import { getVariables } from "@/components/_variables/variables";
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
  const variables = getVariables();

  return (
    <div className="w-full">
      <div
        className="rounded-t-2xl px-6 py-4"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
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
              className="font-inter font-medium text-xs xl:text-sm"
              style={{ color: variables.colors.cardHeaderTextColor }}
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
  const variables = getVariables();
  const isPurple = variant === "purple";
  const backgroundColor = isPurple
    ? variables.colors.AccordionPurpleBackgroundColor
    : variables.colors.AccordionBlueBackgroundColor;
  const borderColor = isPurple
    ? variables.colors.AccordionPurpleBorderColor
    : variables.colors.AccordionBlueBorderColor;

  return (
    <div
      className="rounded-2xl border px-6 py-5 shadow-sm"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <div className="grid grid-cols-[100px_1.2fr_1.2fr_1.2fr_140px_200px] gap-6 items-start ">
        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {id}
        </div>

        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {name}
        </div>

        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {platform}
        </div>

        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {createdMethod}
        </div>

        <div className="flex justify-center items-center">
          <Badge
            className="h-7 w-28 p-0 text-xs xl:text-sm font-medium rounded-[20px] border"
            style={{
              backgroundColor:
                status === "Active"
                  ? variables.colors.approvedAssetsBackgroundColor
                  : variables.colors.rejectedAssetsBackgroundColor,
              borderColor: status === "Active" ? "#86EFAC" : "#FFC2A3",
              color:
                status === "Active"
                  ? variables.colors.approvedAssetsIconColor
                  : variables.colors.rejectedAssetsIconColor,
            }}
          >
            {status}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 items-center justify-self-end">
          <Button
            variant="outline"
            className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] border shadow-[0_2px_4px_0_rgba(30,64,175,0.15)]"
            style={{
              color: variables.colors.requestCardViewButtonTextColor,
              borderColor: variables.colors.requestCardViewButtonBorderColor,
              backgroundColor:
                variables.colors.requestCardViewButtonBackgroundColor,
            }}
            onClick={onEditDetails}
          >
            Edit Details
          </Button>
          <Button
            className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] border-0 shadow-[0_2px_4px_0_rgba(30,64,175,0.15)]"
            style={{
              color: variables.colors.requestCardApproveButtonTextColor,
              backgroundColor:
                variables.colors.requestCardApproveButtonBackgroundColor,
            }}
            onClick={onBrandGuidelines}
          >
            Brand Guidelines
          </Button>
        </div>
      </div>
    </div>
  );
}
