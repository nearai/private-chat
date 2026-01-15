import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, generateId } from "@/lib";
import type { ShareRecipientKind } from "@/types";

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
      {recipients.map((recipient, index) => (
        <div
          key={recipient.id}
          className="flex flex-col gap-2 rounded-2xl border border-border/80 p-3 md:flex-row md:items-center"
        >
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <Select
              value={recipient.kind}
              onValueChange={(value) => updateRecipient(recipient.id, { kind: value as ShareRecipientKind })}
            >
              <SelectTrigger className="h-10 rounded-xl bg-transparent">
                <SelectValue placeholder="Recipient type" />
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
              className="flex-1 rounded-xl border border-border/70 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-0"
            />
          </div>
          {allowMultiple && (
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
          {!allowMultiple && index === recipients.length - 1 && <div className="hidden" />}
        </div>
      ))}
      {allowMultiple && (
        <Button
          variant="ghost"
          type="button"
          className="w-full justify-start gap-2 text-muted-foreground text-sm hover:text-foreground"
          onClick={addRecipient}
        >
          <PlusIcon className="size-4" />
          Add recipient
        </Button>
      )}
    </div>
  );
};
