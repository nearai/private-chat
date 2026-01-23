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
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(account);
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
}: ShareRecipientInputsProps) => {
  const maxRecipientCount = 5
  const disabedAddRecipient = recipients.length >= maxRecipientCount

  const updateRecipient = (id: string, updates: Partial<RecipientInputValue>) => {
    onChange(recipients.map((recipient) => (recipient.id === id ? { ...recipient, ...updates } : recipient)));
  };

  const removeRecipient = (id: string) => {
    if (!allowMultiple || recipients.length <= 1) return;
    onChange(recipients.filter((recipient) => recipient.id !== id));
  };

  const addRecipient = () => {
    onChange([...recipients, createRecipientInput()]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {recipients.map((recipient, index) => {
        const isValid = !recipient.value || (recipient.kind === "email" ? isValidEmail(recipient.value) : isValidNearAccount(recipient.value));

        return (
          <div
            key={recipient.id}
            className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-muted/10 p-2 transition-all focus-within:bg-background focus-within:shadow-sm focus-within:ring-1 focus-within:ring-border/50 md:flex-row md:items-center"
          >
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
              <Select
                value={recipient.kind}
                onValueChange={(value) => updateRecipient(recipient.id, { kind: value as ShareRecipientKind })}
              >
                <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background text-xs md:w-[130px]">
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
                  "h-9 flex-1 rounded-xl border bg-background px-3 text-sm outline-none transition-all",
                  isValid
                    ? "border-border/40 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
                    : "border-destructive/50 focus:border-destructive"
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
                className="self-start text-muted-foreground hover:text-foreground"
              >
                <TrashIcon className="size-4" />
              </Button>
            )}
            {(!allowMultiple || recipients.length === 1) && index === recipients.length - 1 && <div className="hidden" />}
          </div>
        );
      })}
      {allowMultiple && !disabedAddRecipient && (
        <Button
          variant="ghost"
          type="button"
          className="h-8 w-fit gap-1.5 px-2 text-muted-foreground/70 text-xs hover:bg-transparent hover:text-foreground"
          onClick={addRecipient}
          disabled={disabedAddRecipient}
        >
          <PlusIcon className="size-3.5" />
          Add Recipient
        </Button>
      )}
    </div>
  );
};
