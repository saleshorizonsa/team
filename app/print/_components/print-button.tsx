"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintButton({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [auto]);

  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
