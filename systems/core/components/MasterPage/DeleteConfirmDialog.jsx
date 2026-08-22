import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteConfirmDialog({ deleteTarget, setDeleteTarget, deleteLoading, onConfirm }) {
  const handleDeleteConfirm = onConfirm;
  return (
      <Sheet open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <SheetContent className="sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Master Entry
            </SheetTitle>
            <SheetDescription className="pt-2 text-zinc-600 dark:text-zinc-300">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-white">"{deleteTarget?.name}"</strong>?
              <br /><br />
              <span className="text-red-600 dark:text-red-400 font-semibold block bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                Warning: This cannot be undone.
              </span>
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
