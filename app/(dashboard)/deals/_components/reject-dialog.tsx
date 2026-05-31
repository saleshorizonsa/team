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
  onConfirm: (reason: string) => Promise<void>;
  dealNumber?: string;
}

export function RejectDialog({ open, onClose, onConfirm, dealNumber }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!reason.trim()) { setError("A reason is required"); return; }
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
    setReason(""); setError(""); onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Reject Deal"
      description={dealNumber ? `${dealNumber} will be sent back to its creator.` : undefined}
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rejectReason">Reason for rejection *</Label>
          <Textarea
            id="rejectReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what needs to change…"
            rows={3}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reject Deal
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
