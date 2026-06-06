import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuickBooksDataPanel, type QuickBooksSyncPayload } from "@/components/QuickBooksDataPanel";

interface QuickBooksSyncResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: QuickBooksSyncPayload | null;
}

export function QuickBooksSyncResultDialog({
  open,
  onOpenChange,
  payload,
}: QuickBooksSyncResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] bg-[#12161c] border-slate-800 text-slate-100 p-0 gap-0 overflow-hidden flex flex-col shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800 shrink-0 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            QuickBooks sync complete
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review live figures pulled from QuickBooks Online before continuing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5 max-h-[min(70vh,640px)]">
          {payload ? <QuickBooksDataPanel data={payload} /> : null}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-slate-800 shrink-0 bg-slate-900/30">
          <Button
            className="bg-slate-100 text-slate-900 hover:bg-white"
            onClick={() => onOpenChange(false)}
          >
            Close and review dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
