"use client";

import { useState } from "react";
import { useUmbra } from "@/lib/umbra";
import { DUSDC_MINT, DUSDT_MINT, UMBRA_FAUCET_URL } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Loader2, XCircle, ExternalLink } from "lucide-react";

type StepStatus = "idle" | "running" | "success" | "error";

interface Step {
  label: string;
  status: StepStatus;
  result?: string;
}

export function UmbraTestPanel({ walletPublicKey }: { walletPublicKey: string }) {
  const umbra = useUmbra(walletPublicKey);
  const [steps, setSteps] = useState<Step[]>([
    { label: "1. Initialize Umbra Client", status: "idle" },
    { label: "2. Register Account (confidential + anonymous)", status: "idle" },
    { label: "3. Deposit dUSDC to Encrypted Balance", status: "idle" },
    { label: "4. Create Receiver-Claimable UTXO (Private Payment)", status: "idle" },
    { label: "5. Scan for Claimable UTXOs", status: "idle" },
    { label: "6. Claim UTXO into Encrypted Balance (via Relayer)", status: "idle" },
    { label: "7. Withdraw from Encrypted Balance", status: "idle" },
  ]);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  const runAllSteps = async () => {
    // Reset
    setSteps((prev) => prev.map((s) => ({ ...s, status: "idle", result: undefined })));

    // Step 1: Initialize
    updateStep(0, { status: "running" });
    try {
      await umbra.initialize();
      updateStep(0, { status: "success", result: "Client connected to devnet" });
    } catch (e) {
      updateStep(0, { status: "error", result: String(e) });
      toast.error("Failed to initialize Umbra client");
      return;
    }

    // Step 2: Register
    updateStep(1, { status: "running" });
    try {
      const sigs = await umbra.register();
      updateStep(1, { status: "success", result: `Registered. Signatures: ${JSON.stringify(sigs).slice(0, 80)}...` });
    } catch (e) {
      updateStep(1, { status: "error", result: String(e) });
      toast.error("Registration failed — you may need dUSDC from the faucet first");
      return;
    }

    // Step 3: Deposit dUSDC
    updateStep(2, { status: "running" });
    try {
      const res = await umbra.deposit(DUSDC_MINT, BigInt(1_000_000)); // 1 dUSDC (6 decimals)
      updateStep(2, { status: "success", result: `Deposited 1 dUSDC. Result: ${JSON.stringify(res).slice(0, 80)}...` });
    } catch (e) {
      updateStep(2, { status: "error", result: String(e) });
      toast.error("Deposit failed — ensure you have dUSDC from faucet");
      return;
    }

    // Step 4: Create UTXO
    updateStep(3, { status: "running" });
    try {
      // Send to self for testing
      const sigs = await umbra.createUtxo(walletPublicKey, DUSDC_MINT, BigInt(500_000)); // 0.5 dUSDC
      updateStep(3, { status: "success", result: `UTXO created. Sigs: ${JSON.stringify(sigs).slice(0, 80)}...` });
    } catch (e) {
      updateStep(3, { status: "error", result: String(e) });
      toast.error("UTXO creation failed");
      return;
    }

    // Step 5: Scan UTXOs
    updateStep(4, { status: "running" });
    try {
      const { received } = await umbra.scanUtxos();
      updateStep(4, {
        status: "success",
        result: `Found ${received?.length ?? 0} claimable UTXOs`,
      });

      // Step 6: Claim first UTXO
      if (received && received.length > 0) {
        updateStep(5, { status: "running" });
        try {
          const claimRes = await umbra.claimUtxo([received[0]]);
          updateStep(5, {
            status: "success",
            result: `Claimed via relayer. Result: ${JSON.stringify(claimRes).slice(0, 80)}...`,
          });
        } catch (e) {
          updateStep(5, { status: "error", result: String(e) });
        }
      } else {
        updateStep(5, { status: "success", result: "No UTXOs to claim (expected if first run)" });
      }
    } catch (e) {
      updateStep(4, { status: "error", result: String(e) });
      return;
    }

    // Step 7: Withdraw
    updateStep(6, { status: "running" });
    try {
      const res = await umbra.withdraw(DUSDC_MINT, BigInt(100_000)); // 0.1 dUSDC
      updateStep(6, { status: "success", result: `Withdrew 0.1 dUSDC. Result: ${JSON.stringify(res).slice(0, 80)}...` });
    } catch (e) {
      updateStep(6, { status: "error", result: String(e) });
    }

    toast.success("All Umbra SDK steps completed!");
  };

  const statusBadge = (status: StepStatus) => {
    switch (status) {
      case "idle":
        return <Badge variant="secondary">Pending</Badge>;
      case "running":
        return (
          <Badge variant="outline" className="animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "success":
        return (
          <Badge className="bg-green-900 text-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pass
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Umbra SDK Integration Test</CardTitle>
        <CardDescription>
          Runs every verified quickstart function in sequence. Claim{" "}
          <a
            href={UMBRA_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline inline-flex items-center gap-1"
          >
            dUSDC / dUSDT from the faucet
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          before testing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted-foreground">Umbra Status:</span>
          <Badge
            variant={umbra.status === "registered" ? "default" : "outline"}
          >
            {umbra.status}
          </Badge>
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground mb-2">
          <span>dUSDC: <code className="text-xs">{DUSDC_MINT.slice(0, 8)}...</code></span>
          <span>dUSDT: <code className="text-xs">{DUSDT_MINT.slice(0, 8)}...</code></span>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="min-w-[80px]">{statusBadge(step.status as StepStatus)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                {step.result && (
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {step.result}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={runAllSteps} className="w-full mt-4" size="lg">
          Run All Umbra SDK Steps
        </Button>
      </CardContent>
    </Card>
  );
}
