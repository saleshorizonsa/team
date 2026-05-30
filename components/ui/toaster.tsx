"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "bg-card border text-foreground text-sm shadow-lg",
          error: "bg-destructive/10 border-destructive/30 text-destructive",
          success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
        },
      }}
    />
  );
}
