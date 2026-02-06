import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, generateId } from "@/lib";
import type { ShareRecipientKind } from "@/types";

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidNearAccount = (account: string) => {
  if (account.length < 2 || account.length > 64) return false;
  return /^([a-z\d]+(?:[-_][a-z\d]+)*\.)*([a-z\d]+(?:[-_][a-z\d]+)*)$/.test(account);
};

export type RecipientInputValue = {
  id: string;
  kind: ShareRecipientKind;
  value: string;
};

interface ShareRecipientInputsProps {
  recipients: RecipientInputValue[];
  onChange: (recipients: RecipientInputValue[]) => void;
  allowMultiple?: boolean;
  className?: string;
  placeholder?: string;
  errors?: Record<string, string>;
}

export const createRecipientInput = (kind: ShareRecipientKind = "email"): RecipientInputValue => ({
  id: generateId(),
  kind,
  value: "",
});

export const ShareRecipientInputs = ({
  recipients,
  onChange,
  allowMultiple = true,
  className,
  placeholder,
  errors = {},
}: ShareRecipientInputsProps) => {
  const maxRecipientCount = 5;
  const disabledAddRecipient = recipients.length >= maxRecipientCount;

  const updateRecipient = (id: string, updates: Partial<RecipientInputValue>) => {
    onChange(recipients.map((recipient) => (recipient.id === id ? { ...recipient, ...updates } : recipient)));
  };

  const removeRecipient = (id: string) => {
    if (!allowMultiple || recipients.length <= 1) return;
    onChange(recipients.filter((recipient) => recipient.id !== id));
  };

  const addRecipient = () => {
    const lastKind = recipients[recipients.length - 1]?.kind || "email";
    onChange([...recipients, createRecipientInput(lastKind)]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {recipients.map((recipient) => {
        const isValid =
          !recipient.value || (recipient.kind === "email" ? isValidEmail(recipient.value) : isValidNearAccount(recipient.value));
        const error = errors[recipient.id];
        const hasError = !!error || !isValid;

        return (
          <div key={recipient.id} className="group flex flex-col gap-1">
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border border-border/30 bg-muted/10 p-2 transition-all focus-within:bg-background focus-within:shadow-sm focus-within:ring-1 focus-within:ring-border/50",
                hasError && "border-destructive/50 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
              )}
            >
              <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row">
                <Select
                  value={recipient.kind}
                  onValueChange={(value) => updateRecipient(recipient.id, { kind: value as ShareRecipientKind })}
                >
                  <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background text-xs sm:w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-border/70">
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="near_account">NEAR Account</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  value={recipient.value}
                  onChange={(event) => updateRecipient(recipient.id, { value: event.target.value })}
                  placeholder={placeholder ?? (recipient.kind === "near_account" ? "example.near" : "person@example.com")}
                  className={cn(
                    "h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-all sm:w-auto sm:flex-1",
                    isValid && !error
                      ? "border-border/40 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
                      : "border-destructive/50 text-destructive placeholder:text-destructive/50 focus:border-destructive focus:ring-1 focus:ring-destructive/20"
                  )}
                />
              </div>
              {allowMultiple && recipients.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => removeRecipient(recipient.id)}
                  title="Remove recipient"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
            {error && <p className="ml-1 font-medium text-[11px] text-destructive tracking-wide">{error}</p>}
          </div>
        );
      })}
      {allowMultiple && !disabledAddRecipient && (
        <Button
          variant="ghost"
          type="button"
          className="h-8 w-fit gap-1.5 px-2 text-muted-foreground/70 text-xs hover:bg-transparent hover:text-foreground"
          onClick={addRecipient}
          disabled={disabledAddRecipient}
        >
          <PlusIcon className="size-3.5" />
          Add Recipient
        </Button>
      )}
    </div>
  );
};
