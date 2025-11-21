import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/time";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium text-base leading-[normal] outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/60 active:bg-primary/80",
        destructive:
          "bg-destructive hover:bg-destructive/60 focus-visible:ring-destructive/20 active:bg-destructive/80",
        secondary: "bg-secondary/30 text-secondary-foreground hover:bg-secondary/60 active:bg-secondary/80",
        ghost: "bg-transparent text-foreground hover:bg-secondary/20 active:bg-secondary/40",
        blue: "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-800 dark:active:bg-blue-800 dark:hover:bg-blue-700",
      },
      size: {
        default: "h-9 px-3 py-1.5 text-sm has-[>svg]:px-1.5",
        icon: "size-6 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants, type ButtonProps };
