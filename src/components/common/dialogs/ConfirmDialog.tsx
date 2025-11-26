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

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            {t("Cancel")}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
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
