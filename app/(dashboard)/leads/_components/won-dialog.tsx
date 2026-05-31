"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight } from "lucide-react";
import type { Lead } from "./lead-types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function WonDialog({ open, onClose, lead }: Props) {
  const router = useRouter();

  function convert() {
    if (!lead) return;
    const params = new URLSearchParams({ leadId: lead.id });
    if (lead.customerId) params.set("customerId", lead.customerId);
    if (lead.ownerId) params.set("salespersonId", lead.ownerId);
    router.push(`/deals?${params.toString()}`);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Lead Won! 🎉" className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
          <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              &ldquo;{lead?.title}&rdquo; marked as WON
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Convert this lead into a deal — the customer and salesperson will be pre-filled and the records linked together.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Later</Button>
          <Button onClick={convert}>
            Convert to Deal
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
