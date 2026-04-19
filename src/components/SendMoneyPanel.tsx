import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  provider: string;
  amount: number;
  currencySymbol: string;
  senderNumber: string;
  trxId: string;
  onSenderChange: (v: string) => void;
  onTrxIdChange: (v: string) => void;
  settings: any;
}

/**
 * Reusable "Send Money" instructions + sender/TrxID input panel,
 * shared by Checkout.tsx and LandingPage.tsx to remove duplication.
 */
export function SendMoneyPanel({
  provider, amount, currencySymbol, senderNumber, trxId,
  onSenderChange, onTrxIdChange, settings,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isBkash = provider === "bkash_send";
  const merchantNumber = isBkash
    ? settings?.bkash_send_number || ""
    : settings?.nagad_send_number || "";
  const instructions = isBkash
    ? settings?.bkash_send_instructions ||
      "1. Open bKash app\n2. Tap Send Money\n3. Enter the number shown\n4. Enter the exact amount\n5. Submit your sender number and TrxID below"
    : settings?.nagad_send_instructions ||
      "1. Open Nagad app\n2. Tap Send Money\n3. Enter the number shown\n4. Enter the exact amount\n5. Submit your sender number and TrxID below";

  const copyNumber = () => {
    if (!merchantNumber) return;
    navigator.clipboard.writeText(merchantNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="border-t border-border p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div
        className={`rounded-xl p-3 sm:p-4 ${
          isBkash
            ? "bg-pink-500/5 border border-pink-500/20"
            : "bg-orange-500/5 border border-orange-500/20"
        }`}
      >
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Send {currencySymbol}
          {amount.toFixed(2)} to
        </p>
        {merchantNumber ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg sm:text-2xl font-mono font-bold tracking-wider sm:tracking-widest break-all">
              {merchantNumber}
            </span>
            <button
              type="button"
              onClick={copyNumber}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
              title="Copy number"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-sm text-destructive">
            Merchant number not configured. Please contact support.
          </p>
        )}
      </div>
      <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 rounded-xl p-3">
        {instructions}
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">
            Your {isBkash ? "bKash" : "Nagad"} Number *
          </label>
          <input
            value={senderNumber}
            onChange={(e) => onSenderChange(e.target.value)}
            className={inputClass}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">
            Transaction ID (TrxID) *
          </label>
          <input
            value={trxId}
            onChange={(e) => onTrxIdChange(e.target.value)}
            className={inputClass}
            placeholder="e.g. BIxxxxxxxx"
          />
        </div>
      </div>
    </div>
  );
}
