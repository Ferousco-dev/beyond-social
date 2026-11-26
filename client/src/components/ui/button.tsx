import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** The shared button: the `.btn` classes in globals.css, in four looks and three sizes. */
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      destructive: "btn-danger",
      outline: "btn-secondary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      link: "h-auto border-0 bg-transparent p-0 font-medium text-primary shadow-none underline-offset-4 hover:underline",
    },
    size: {
      default: "btn-md",
      sm: "btn-sm",
      lg: "btn-lg",
      icon: "btn-md w-9 px-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
export type { ButtonProps };
