"use client";

import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconProps = LucideProps & {
  name: string;
};

/** Dynamically render a Lucide icon by name. */
export function LucideIcon({ name, ...props }: IconProps) {
  const IconComp = (Icons as unknown as Record<string, React.FC<LucideProps>>)[
    name
  ];
  if (!IconComp) {
    const Fallback = Icons.Circle;
    return <Fallback {...props} />;
  }
  return <IconComp {...props} />;
}
