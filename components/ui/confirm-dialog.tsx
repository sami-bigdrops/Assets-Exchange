/**
 * Confirm Dialog Component
 * 
 * A production-ready, customizable confirmation dialog component built on top of Radix UI AlertDialog.
 * Provides a consistent, accessible way to confirm user actions throughout the application.
 * 
 * Features:
 * - Multiple variants: default, destructive, success
 * - Dynamic icon system: warning, info, success, error
 * - Smooth animations and transitions
 * - Full keyboard navigation support
 * - Promise-based API for easy integration
 * - React Context API for state management
 * - Standalone function support for use outside React components
 * 
 * Usage:
 * ```tsx
 * // Using the hook
 * const confirm = useConfirmDialog();
 * const result = await confirm({
 *   title: "Delete Item",
 *   description: "Are you sure you want to delete this item?",
 *   variant: "destructive",
 *   onConfirm: () => handleDelete(),
 * });
 * 
 * // Using the standalone function
 * const result = await confirmDialog({
 *   title: "Save Changes",
 *   description: "Do you want to save your changes?",
 *   onConfirm: () => handleSave(),
 * });
 * ```
 * 
 * @module components/ui/confirm-dialog
 */

"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Options for configuring a confirmation dialog
 */
export interface ConfirmDialogOptions {
  /** Title of the dialog. Defaults to "Confirm Action" */
  title?: string;
  /** Description/body text of the dialog. Required. */
  description: string;
  /** Text for the confirm button. Defaults to "Confirm" */
  confirmText?: string;
  /** Text for the cancel button. Defaults to "Cancel" */
  cancelText?: string;
  /** Visual variant of the dialog */
  variant?: "default" | "destructive" | "success";
  /** Optional icon to display */
  icon?: "warning" | "info" | "success" | "error";
  /** Callback when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Optional callback when user cancels */
  onCancel?: () => void | Promise<void>;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmDialogContextType {
  showDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

// Global store for standalone confirmDialog function
let globalDialogStore: ConfirmDialogContextType | null = null;

/**
 * Hook to access the confirm dialog functionality
 * @returns Function to show a confirmation dialog
 * @throws Error if used outside ConfirmDialogProvider
 */
export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context.showDialog;
}

/**
 * Standalone function to show a confirmation dialog
 * Can be used outside React components
 * @param options - Configuration options for the dialog
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (globalDialogStore) {
    return globalDialogStore.showDialog(options);
  }
  // Fallback: resolve immediately if provider not available
  console.warn("ConfirmDialogProvider not found. Dialog will not be shown.");
  return Promise.resolve(false);
}

/**
 * Provider component that manages the confirmation dialog state
 * Must be rendered at the root of your application
 */
export function ConfirmDialogProvider() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const showDialog = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  // Register global store for standalone confirmDialog function
  useEffect(() => {
    globalDialogStore = { showDialog };
    return () => {
      globalDialogStore = null;
    };
  }, [showDialog]);

  const handleConfirm = useCallback(async () => {
    if (state.options) {
      try {
        await Promise.resolve(state.options.onConfirm());
      } catch (error) {
        console.error("Error in confirmDialog onConfirm callback:", error);
      }
    }
    if (state.resolve) {
      state.resolve(true);
    }
    setState({
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, [state]);

  const handleCancel = useCallback(async () => {
    if (state.options?.onCancel) {
      try {
        await Promise.resolve(state.options.onCancel());
      } catch (error) {
        console.error("Error in confirmDialog onCancel callback:", error);
      }
    }
    if (state.resolve) {
      state.resolve(false);
    }
    setState({
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, [state]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && state.isOpen) {
        // Dialog is being closed (e.g., clicking outside or pressing ESC)
        handleCancel();
      }
    },
    [state.isOpen, handleCancel]
  );

  const variables = getVariables();
  const isDestructive = state.options?.variant === "destructive";
  const isSuccess = state.options?.variant === "success";
  const iconType = state.options?.icon || (isDestructive ? "error" : isSuccess ? "success" : "warning");

  // Determine icon and colors based on variant and icon type
  const getIconConfig = () => {
    if (iconType === "error" || isDestructive) {
      return {
        icon: AlertTriangle,
        bgColor: variables.colors.rejectedAssetsBackgroundColor,
        iconColor: variables.colors.rejectedAssetsIconColor,
        borderColor: "#FFC2A3",
      };
    }
    if (iconType === "success" || isSuccess) {
      return {
        icon: CheckCircle2,
        bgColor: variables.colors.approvedAssetsBackgroundColor,
        iconColor: variables.colors.approvedAssetsIconColor,
        borderColor: "#86EFAC",
      };
    }
    // Default warning/info
    return {
      icon: AlertCircle,
      bgColor: "#FEF3C7",
      iconColor: "#F59E0B",
      borderColor: "#FCD34D",
    };
  };

  const iconConfig = getIconConfig();
  const IconComponent = iconConfig.icon;
  const showIcon = state.options?.icon !== undefined || isDestructive || isSuccess;

  return (
    <ConfirmDialogContext.Provider value={{ showDialog }}>
      <AlertDialog open={state.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent
          className="max-w-md w-full mx-4 p-0 overflow-hidden"
          style={{
            backgroundColor: variables.colors.cardBackground,
            borderColor: variables.colors.inputBorderColor,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              {showIcon && (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: iconConfig.bgColor,
                    border: `2px solid ${iconConfig.borderColor}`,
                  }}
                  data-icon-container
                  aria-hidden="true"
                >
                  <IconComponent
                    className="h-6 w-6 transition-transform duration-200"
                    style={{ color: iconConfig.iconColor }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 pt-0.5">
                <AlertDialogTitle
                  className="text-xl font-semibold font-inter leading-tight mb-3"
                  style={{ 
                    color: "#000000",
                    display: "block",
                    visibility: "visible",
                    opacity: 1,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    margin: 0,
                    marginBottom: "0.75rem",
                    lineHeight: "1.5",
                  }}
                >
                  {state.options?.title || "Confirm Action"}
                </AlertDialogTitle>
                <AlertDialogDescription
                  className="text-sm font-inter leading-relaxed"
                  style={{ color: variables.colors.descriptionColor }}
                >
                  {state.options?.description}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 pb-6 pt-4 gap-3 sm:gap-3 sm:flex-row sm:justify-end border-t bg-muted/30">
            <AlertDialogCancel
              onClick={handleCancel}
              className="font-inter h-11 px-5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] order-2 sm:order-1 min-w-[100px]"
              style={{
                backgroundColor: variables.colors.buttonOutlineBackgroundColor,
                borderColor: variables.colors.buttonOutlineBorderColor,
                color: variables.colors.buttonOutlineTextColor,
              }}
            >
              {state.options?.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="font-inter h-11 px-5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] order-1 sm:order-2 min-w-[100px] shadow-sm"
              style={
                isDestructive
                  ? {
                      backgroundColor: variables.colors.rejectedAssetsBackgroundColor,
                      color: variables.colors.rejectedAssetsIconColor,
                      borderColor: "#FFC2A3",
                      boxShadow: "0 1px 2px 0 rgba(239, 68, 68, 0.2)",
                    }
                  : {
                      backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                      color: variables.colors.buttonDefaultTextColor,
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    }
              }
            >
              {state.options?.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

