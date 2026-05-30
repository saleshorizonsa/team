"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (lostReason: string) => Promise<void>;
}

export function LostDialog({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!reason.trim()) { setError("Please provide a reason"); return; }
    setLoading(true);
    setError("");
    try {
      await onConfirm(reason.trim());
      setReason("");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setReason("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Mark as Lost" description="What was the reason this lead was lost?" className="max-w-md">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="lostReason">Reason *</Label>
          <Textarea
            id="lostReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Budget constraints, went with competitor…"
            rows={3}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Mark as Lost
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
