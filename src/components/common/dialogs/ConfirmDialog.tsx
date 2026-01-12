import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

type ConfirmDialogProps = {
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isLoading?: boolean;
  open: boolean;
};

const ConfirmDialog = ({
  title,
  description,
  onConfirm,
  onCancel,
  confirmText,
  isLoading = false,
  open
}: ConfirmDialogProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const handleCancel = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onCancel();
  };

  const handleConfirm = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onConfirm();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {t("Cancel")}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("Processing") : (confirmText ?? t("Confirm"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
