"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "oklch(1 0 0)",
          "--normal-text": "oklch(0.145 0 0)",
          "--normal-border": "oklch(0.922 0 0)",
          "--border-radius": "var(--radius)",
          "--success-bg": "oklch(1 0 0)",
          "--success-text": "oklch(0.145 0 0)",
          "--success-border": "oklch(0.922 0 0)",
          "--error-bg": "oklch(1 0 0)",
          "--error-text": "oklch(0.145 0 0)",
          "--error-border": "oklch(0.922 0 0)",
          "--warning-bg": "oklch(1 0 0)",
          "--warning-text": "oklch(0.145 0 0)",
          "--warning-border": "oklch(0.922 0 0)",
          "--info-bg": "oklch(1 0 0)",
          "--info-text": "oklch(0.145 0 0)",
          "--info-border": "oklch(0.922 0 0)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
