import type { ReactNode } from "react";

export function Tag({ children }: { children: ReactNode }) {
  return <li className="tag">{children}</li>;
}

export function TagList({ children }: { children: ReactNode }) {
  return <ul className="tag-list">{children}</ul>;
}
