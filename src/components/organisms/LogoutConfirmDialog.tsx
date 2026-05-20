import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-on-surface" />
            Đăng xuất
          </DialogTitle>
        </DialogHeader>
        <p className="text-on-surface-variant text-sm">
          Bạn có chắc chắn muốn đăng xuất?
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Đăng xuất
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
