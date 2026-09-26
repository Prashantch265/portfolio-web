import type { CSSProperties, ElementType, ReactNode } from "react";

type TextProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

/** `<h1 class="text-display">` — the hero positioning statement. */
export function Display({ children, className, style, id }: TextProps) {
  const classes = ["text-display", className].filter(Boolean).join(" ");
  return (
    <h1 className={classes} style={style} id={id}>
      {children}
    </h1>
  );
}

/**
 * Semantic level and visual size are deliberately decoupled in this design
 * system (the mockup routinely renders `<h2 class="text-h3">`) — `as`
 * controls the tag, `size` controls the class, independently.
 */
export function Heading({
  as = "h2",
  size = "h2",
  children,
  className,
  style,
  id,
}: TextProps & { as?: ElementType; size?: "h2" | "h3" }) {
  const Tag = as;
  const classes = [`text-${size}`, className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} style={style} id={id}>
      {children}
    </Tag>
  );
}

export function Body({
  size = "default",
  children,
  className,
  style,
}: TextProps & { size?: "lg" | "default" | "small" }) {
  const sizeClass = size === "default" ? undefined : size === "lg" ? "text-body-lg" : "text-small";
  const classes = [sizeClass, className].filter(Boolean).join(" ");
  return (
    <p className={classes || undefined} style={style}>
      {children}
    </p>
  );
}

/** Small-caps mono eyebrow label. */
export function Label({ children, className, style }: TextProps) {
  const classes = ["label", className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}

/** Mono metadata text (dates, tech tags, key-value pairs). */
export function Mono({ children, className, style }: TextProps) {
  const classes = ["mono-meta", className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
