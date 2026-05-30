"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  leadTitle: string;
}

export function WonDialog({ open, onClose, leadTitle }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Lead Won! 🎉" className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
          <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              &ldquo;{leadTitle}&rdquo; marked as WON
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Converting to a Deal will be available in Phase 3. The lead stage has been updated.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Dialog>
  );
}
