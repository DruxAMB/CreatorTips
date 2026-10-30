"use client";

import { Toaster as Sonner } from "sonner";

// Monzo-styled: white paper toast, soft-mint hairline, pill radius.
export default function Toaster() {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: 24,
          color: "var(--color-foreground)",
          fontFamily: "inherit",
          boxShadow: "var(--shadow-float)",
        },
      }}
    />
  );
}
