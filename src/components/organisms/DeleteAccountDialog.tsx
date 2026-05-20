import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteFirebaseAccount,
  reauthenticateWithGoogle,
} from "@/services/authService";
import { deleteUserData } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountDialog = ({
  isOpen,
  onClose,
}: DeleteAccountDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // Step 1: Clean up Firestore data first (while auth is still valid)
      await deleteUserData(user.uid, user.email ?? "");

      // Step 2: Delete Firebase Auth account
      await deleteFirebaseAccount();

      toast.success("Tài khoản đã được xóa thành công");
      navigate({ to: "/" });
    } catch (err: unknown) {
      const errorCode =
        err instanceof Error && "code" in err
          ? (err as { code: string }).code
          : null;

      if (errorCode === "auth/requires-recent-login") {
        // Re-authenticate then retry
        try {
          await reauthenticateWithGoogle();
          await deleteFirebaseAccount();
          toast.success("Tài khoản đã được xóa thành công");
          navigate({ to: "/" });
        } catch {
          toast.error(
            "Không thể xóa tài khoản. Vui lòng đăng nhập lại và thử lại."
          );
        }
      } else {
        toast.error("Không thể xóa tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error-600">
            <AlertTriangle className="h-5 w-5" />
            Xóa tài khoản
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-on-surface-variant">
            Bạn có chắc chắn muốn xóa tài khoản?
          </p>
          <p className="font-medium text-error-600">
            Hành động này KHÔNG THỂ hoàn tác.
          </p>
          <p className="text-on-surface-variant">
            Tất cả dữ liệu của bạn sẽ bị xóa:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-on-surface-variant">
            <li>Thông tin cá nhân</li>
            <li>Lịch sử chuyến đi</li>
            <li>Dữ liệu chi tiêu liên quan</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Đang xóa..." : "Xóa tài khoản"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
