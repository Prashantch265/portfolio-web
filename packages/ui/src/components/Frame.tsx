import type { ReactNode } from "react";

export function Frame({
  wide = false,
  children,
  className,
  style,
}: {
  wide?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const classes = ["frame", wide && "frame--wide", className].filter(Boolean).join(" ");
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
