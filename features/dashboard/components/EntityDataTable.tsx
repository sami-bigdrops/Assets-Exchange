"use client";

import { ChevronDown } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

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
  align?: "left" | "center" | "right";
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
        className="rounded-t-2xl px-5 py-4 border-b"
        style={{
          backgroundColor: variables.colors.cardHeaderBackgroundColor,
          borderColor: variables.colors.cardHeaderBackgroundColor,
        }}
      >
        <div
          className="grid items-center"
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
              className={`font-inter font-semibold text-xs xl:text-sm tracking-wide ${
                column.align === "left"
                  ? "text-left"
                  : column.align === "right"
                    ? "text-right"
                    : "text-center"
              }`}
              style={{ color: variables.colors.cardHeaderTextColor }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mt-3">
        {data.map((item, index) => (
          <div key={index} className="transition-all duration-200">
            {renderRow(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface VisibilityDropdownProps {
  visibility: "Public" | "Internal" | "Hidden";
  onVisibilityChange: (visibility: "Public" | "Internal" | "Hidden") => void;
  variables: ReturnType<typeof getVariables>;
}

const VisibilityDropdown = memo(
  ({ visibility, onVisibilityChange, variables }: VisibilityDropdownProps) => {
    const [open, setOpen] = useState(false);

    const handleSelect = useCallback(
      (value: "Public" | "Internal" | "Hidden") => {
        onVisibilityChange(value);
        setOpen(false);
      },
      [onVisibilityChange]
    );

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 w-28 text-xs font-medium rounded-md border pointer-events-auto transition-all duration-200 hover:shadow-sm"
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
            <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="min-w-28 z-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={() => handleSelect("Public")}
            className="text-xs cursor-pointer"
          >
            Public
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => handleSelect("Internal")}
            className="text-xs cursor-pointer"
          >
            Internal
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => handleSelect("Hidden")}
            className="text-xs cursor-pointer"
          >
            Hidden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

VisibilityDropdown.displayName = "VisibilityDropdown";

interface EntityDataCardProps {
  id: string;
  name: string;
  platform?: string;
  advName?: string;
  createdMethod: string;
  status: "Active" | "Inactive";
  variant?: "purple" | "blue";
  visibility?: "Public" | "Internal" | "Hidden";
  nameAlign?: "left" | "center" | "right";
  gridTemplateColumns?: string;
  actionButtonsLayout?: "row" | "col";
  onEditDetails?: () => void;
  onBrandGuidelines?: () => void;
  onVisibilityChange?: (visibility: "Public" | "Internal" | "Hidden") => void;
}

export const EntityDataCard = memo(
  ({
    id,
    name,
    platform,
    advName,
    createdMethod,
    status,
    variant = "purple",
    visibility,
    nameAlign = "left",
    gridTemplateColumns = "100px 2.5fr 1fr 1fr 140px 340px",
    actionButtonsLayout = "col",
    onEditDetails,
    onBrandGuidelines,
    onVisibilityChange,
  }: EntityDataCardProps) => {
    const variables = getVariables();
    const isPurple = variant === "purple";
    const backgroundColor = useMemo(
      () =>
        isPurple
          ? variables.colors.AccordionPurpleBackgroundColor
          : variables.colors.AccordionBlueBackgroundColor,
      [isPurple, variables.colors]
    );
    const borderColor = useMemo(
      () =>
        isPurple
          ? variables.colors.AccordionPurpleBorderColor
          : variables.colors.AccordionBlueBorderColor,
      [isPurple, variables.colors]
    );

    return (
      <div
        className="rounded-2xl border px-5 py-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-opacity-80"
        style={{
          backgroundColor,
          borderColor,
        }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns,
            gap: "1.5rem",
          }}
        >
          <div
            className="font-inter text-center text-xs xl:text-sm font-medium leading-relaxed"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {id}
          </div>

          <div
            className={`font-inter text-xs xl:text-sm leading-relaxed ${
              nameAlign === "center"
                ? "text-center"
                : nameAlign === "right"
                  ? "text-right"
                  : "text-left"
            }`}
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {name}
          </div>

          <div
            className="font-inter text-center text-xs xl:text-sm leading-relaxed"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {advName || platform}
          </div>

          <div
            className="font-inter text-center text-xs xl:text-sm leading-relaxed"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {createdMethod}
          </div>

          <div className="flex flex-col gap-2.5 justify-center items-center">
            <Badge
              className="h-7 w-28 p-0 text-xs xl:text-sm font-medium rounded-[20px] border flex items-center justify-center transition-all duration-200 hover:scale-105"
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
            {visibility && onVisibilityChange && (
              <VisibilityDropdown
                visibility={visibility}
                onVisibilityChange={onVisibilityChange}
                variables={variables}
              />
            )}
          </div>

          <div
            className={`flex ${actionButtonsLayout === "row" ? "flex-row" : "flex-col"} gap-2.5 items-center justify-center`}
          >
            <Button
              variant="outline"
              className="h-9 w-36 font-inter text-xs xl:text-sm font-medium rounded-md border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
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
              className="h-9 w-36 font-inter text-xs xl:text-sm font-medium rounded-md border-0 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
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
);

EntityDataCard.displayName = "EntityDataCard";
