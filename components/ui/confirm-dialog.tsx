"use client";

import { AlertTriangle } from "lucide-react";
import { useState, useCallback } from "react";

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

interface ConfirmDialogOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
}

let confirmDialogState: ConfirmDialogState = {
  isOpen: false,
  options: null,
};

let setConfirmDialogState: ((state: ConfirmDialogState) => void) | null = null;

export function ConfirmDialogProvider() {
  const [state, setState] = useState<ConfirmDialogState>(confirmDialogState);

  setConfirmDialogState = setState;

  const handleConfirm = useCallback(() => {
    if (state.options) {
      state.options.onConfirm();
    }
    setState({ isOpen: false, options: null });
    confirmDialogState = { isOpen: false, options: null };
  }, [state]);

  const handleCancel = useCallback(() => {
    if (state.options?.onCancel) {
      state.options.onCancel();
    }
    setState({ isOpen: false, options: null });
    confirmDialogState = { isOpen: false, options: null };
  }, [state]);

  const variables = getVariables();
  const isDestructive = state.options?.variant === "destructive";

  return (
    <AlertDialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: variables.colors.cardBackground,
          borderColor: variables.colors.inputBorderColor,
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: variables.colors.rejectedAssetsBackgroundColor,
                }}
              >
                <AlertTriangle
                  className="h-5 w-5"
                  style={{ color: variables.colors.rejectedAssetsIconColor }}
                />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle
                className="text-lg font-semibold font-inter"
                style={{ color: variables.colors.cardHeaderTextColor }}
              >
                {state.options?.title || "Confirm Action"}
              </AlertDialogTitle>
              <AlertDialogDescription
                className="mt-2 text-sm font-inter leading-relaxed"
                style={{ color: variables.colors.descriptionColor }}
              >
                {state.options?.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={handleCancel}
            className="font-inter"
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
            className="font-inter"
            style={
              isDestructive
                ? {
                    backgroundColor: variables.colors.rejectedAssetsBackgroundColor,
                    color: variables.colors.rejectedAssetsIconColor,
                    borderColor: "#FFC2A3",
                  }
                : {
                    backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                    color: variables.colors.buttonDefaultTextColor,
                  }
            }
          >
            {state.options?.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const wrappedOptions: ConfirmDialogOptions = {
      ...options,
      onConfirm: () => {
        options.onConfirm();
        resolve(true);
      },
      onCancel: () => {
        options.onCancel?.();
        resolve(false);
      },
    };

    confirmDialogState = {
      isOpen: true,
      options: wrappedOptions,
    };

    if (setConfirmDialogState) {
      setConfirmDialogState(confirmDialogState);
    }
  });
}

export function useConfirmDialog() {
  return useCallback(
    (options: Omit<ConfirmDialogOptions, "onConfirm" | "onCancel">) => {
      return confirmDialog({
        ...options,
        onConfirm: () => {},
        onCancel: () => {},
      });
    },
    []
  );
}
