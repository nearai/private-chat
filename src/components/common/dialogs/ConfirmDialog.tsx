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
import Spinner from "../Spinner";

type ConfirmDialogProps = {
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
  isLoading?: boolean;
  confirmText?: string;
};

const ConfirmDialog = ({
  title,
  description,
  onConfirm,
  onCancel,
  open,
  confirmText,
  isLoading,
}: ConfirmDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading} className="flex items-center gap-2">
            {isLoading && <Spinner className="size-4" />}
            {confirmText ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
