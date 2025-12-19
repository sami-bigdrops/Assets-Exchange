"use client";

import { ChevronDown } from "lucide-react";

import { getVariables } from "@/components/_variables/variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        className="rounded-t-2xl px-5 py-3.5"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
        <div
          className="grid items-center justify-center text-center"
          style={{
            gridTemplateColumns: columns
              .map((col) => col.width || "1fr")
              .join(" "),
            gap: "1.5rem",
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

      <div className="space-y-2.5 mt-2">
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
  platform?: string;
  advName?: string;
  createdMethod: string;
  status: "Active" | "Pending" | "Inactive";
  variant?: "purple" | "blue";
  visibility?: "Public" | "Internal" | "Hidden";
  onEditDetails?: () => void;
  onBrandGuidelines?: () => void;
  onVisibilityChange?: (visibility: "Public" | "Internal" | "Hidden") => void;
}

export function EntityDataCard({
  id,
  name,
  platform,
  advName,
  createdMethod,
  status,
  variant = "purple",
  visibility,
  onEditDetails,
  onBrandGuidelines,
  onVisibilityChange,
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
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: "100px 1.2fr 1.2fr 1.2fr 140px 340px",
          gap: "1.5rem",
        }}
      >
        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {id}
        </div>

        <div
          className="font-inter text-center  text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {name}
        </div>

        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {advName || platform}
        </div>

        <div
          className="font-inter text-center text-xs xl:text-sm"
          style={{ color: variables.colors.requestCardTextColor }}
        >
          {createdMethod}
        </div>

        <div className="flex flex-col gap-2 justify-center items-center">
          <Badge
            className="h-7 w-28 p-0 text-xs xl:text-sm font-medium rounded-[20px] border flex items-center justify-center"
            style={{
              backgroundColor:
                status === "Active"
                  ? variables.colors.approvedAssetsBackgroundColor
                  : status === "Pending"
                    ? "#FEF3C7"
                    : variables.colors.rejectedAssetsBackgroundColor,
              borderColor:
                status === "Active"
                  ? "#86EFAC"
                  : status === "Pending"
                    ? "#FCD34D"
                    : "#FFC2A3",
              color:
                status === "Active"
                  ? variables.colors.approvedAssetsIconColor
                  : status === "Pending"
                    ? "#92400E"
                    : variables.colors.rejectedAssetsIconColor,
            }}
          >
            {status}
          </Badge>
          {visibility && onVisibilityChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-28 text-xs font-medium rounded-md border pointer-events-auto"
                  style={{
                    color: variables.colors.buttonOutlineTextColor,
                    borderColor: variables.colors.buttonOutlineBorderColor,
                    backgroundColor: variables.colors.cardBackground,
                  }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {visibility}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="min-w-[7rem] z-[100]"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onVisibilityChange("Public");
                  }}
                  className="text-xs cursor-pointer"
                >
                  Public
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onVisibilityChange("Internal");
                  }}
                  className="text-xs cursor-pointer"
                >
                  Internal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onVisibilityChange("Hidden");
                  }}
                  className="text-xs cursor-pointer"
                >
                  Hidden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-row gap-2.5 items-center justify-center">
          <Button
            variant="outline"
            className="h-9 w-36 font-inter text-xs xl:text-sm font-medium rounded-md border shadow-sm hover:shadow transition-shadow"
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
            className="h-9 w-36 font-inter text-xs xl:text-sm font-medium rounded-md border-0 shadow-sm hover:shadow transition-shadow"
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
