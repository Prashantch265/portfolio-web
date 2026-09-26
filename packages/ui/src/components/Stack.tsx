import type { CSSProperties, ReactNode } from "react";

/**
 * The mockup declared `.stack`/`.gap-2/3/4` in base.css but never used
 * them anywhere — every real layout gap was an inline `style="margin-top:
 * var(--space-N)"` scattered per element instead. This is where those
 * classes finally get used for real, replacing that pattern.
 */
export function Stack({
  gap = 3,
  children,
  className,
  style,
}: {
  gap?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const classes = ["stack", `gap-${gap}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
