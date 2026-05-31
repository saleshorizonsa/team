"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyInput } from "@/lib/validations";

export function CompanyForm({ initial }: { initial: CompanyInput }) {
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [companyVatNumber, setCompanyVatNumber] = useState(initial.companyVatNumber ?? "");
  const [companyAddress, setCompanyAddress] = useState(initial.companyAddress ?? "");
  const [defaultVatRate, setDefaultVatRate] = useState<number>(initial.defaultVatRate ?? 15);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyVatNumber, companyAddress, defaultVatRate }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success("Company settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Shown on statements and used as the default VAT rate for new deals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyVatNumber">Company VAT Number</Label>
            <Input id="companyVatNumber" value={companyVatNumber} onChange={(e) => setCompanyVatNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultVatRate">Default VAT Rate (%)</Label>
            <Input id="defaultVatRate" type="number" inputMode="decimal" min={0} max={100}
              value={defaultVatRate} onChange={(e) => setDefaultVatRate(parseFloat(e.target.value) || 0)}
              className="font-mono w-32" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="companyAddress">Address</Label>
            <Textarea id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Company Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
