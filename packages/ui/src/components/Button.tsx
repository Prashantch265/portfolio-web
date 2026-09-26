import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "filled" | "outline";

export function Button({
  variant = "filled",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const classes = ["btn", variant === "outline" && "btn--outline", className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}

/** Same visual treatment as Button, as a link — the mockup's `mailto:`/CTA anchors use `.btn` too. */
export function ButtonLink({
  variant = "filled",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  const classes = ["btn", variant === "outline" && "btn--outline", className].filter(Boolean).join(" ");
  return <a className={classes} {...props} />;
}
