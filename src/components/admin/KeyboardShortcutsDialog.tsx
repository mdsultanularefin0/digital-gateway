import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts: { keys: string; label: string }[] = [
  { keys: "?", label: "Open this shortcuts panel" },
  { keys: "⌘ / Ctrl + K", label: "Open global search" },
  { keys: "G then D", label: "Go to Dashboard" },
  { keys: "G then O", label: "Go to Orders" },
  { keys: "G then P", label: "Go to Products" },
  { keys: "G then C", label: "Go to Customers" },
  { keys: "Esc", label: "Close drawers, dialogs and overlays" },
];

/**
 * Global "?" hotkey opens a cheat sheet of admin keyboard shortcuts.
 * Mounted once inside AdminLayout.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs / editors
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {shortcuts.map((s) => (
            <li key={s.keys} className="flex items-center justify-between py-2">
              <span className="text-sm">{s.label}</span>
              <kbd className="text-[11px] font-mono bg-muted text-foreground rounded-md px-2 py-1 border border-border">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
          Press <kbd className="font-mono">?</kbd> anywhere in the admin to toggle this panel.
        </p>
      </DialogContent>
    </Dialog>
  );
}
