import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean };

/**
 * Admin's own button, not a reuse of @portfolio/ui's <Button> — the
 * public site's component has no primary/danger/small variants (it
 * never needed them), and inventing a second meaning for its one
 * existing variant prop would be worse than a small sibling component
 * (PRD §5's "tokens, not the whole system").
 */
export function Button({ variant = "default", small, className, ...props }: ButtonProps) {
  const classes = ["btn", variant !== "default" && `btn--${variant}`, small && "btn--small", className]
    .filter(Boolean)
    .join(" ");
  return <button type="button" className={classes} {...props} />;
}

export function ButtonLink({
  variant = "default",
  small,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; small?: boolean }) {
  const classes = ["btn", variant !== "default" && `btn--${variant}`, small && "btn--small", className]
    .filter(Boolean)
    .join(" ");
  return <a className={classes} {...props} />;
}
