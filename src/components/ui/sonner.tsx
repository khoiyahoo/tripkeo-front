"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm rounded-xl shadow-lg",
          title: "font-semibold",
          description: "text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
