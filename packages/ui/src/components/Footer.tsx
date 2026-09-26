import Link from "next/link";
import { Frame } from "./Frame";
import { StatusStrip } from "./StatusStrip";

export function Footer({
  statusStrip,
  variant = "default",
}: {
  statusStrip?: { build: "passing" | "failing"; lastDeploy: string };
  /** "home" drops the footer status strip (the prominent one already covers it) and adds the built-with note. "bare" drops the link list entirely (404 / brand). */
  variant?: "default" | "home" | "bare";
}) {
  return (
    <footer className="site-footer">
      <Frame>
        <hr className="rule" />
        {statusStrip && variant !== "home" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <StatusStrip build={statusStrip.build} lastDeploy={statusStrip.lastDeploy} variant="footer" />
          </div>
        )}
        <div className="site-footer__row" style={{ marginTop: "var(--space-5)" }}>
          <p className="text-small">
            © <span>{new Date().getFullYear()}</span> Prashant Chaudhary. Kathmandu, Nepal.
          </p>
          {variant !== "bare" && (
            <ul className="site-footer__links">
              <li>
                <a href="mailto:prashantchy265@gmail.com">Email</a>
              </li>
              <li>
                <a href="https://github.com/Prashantch265" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/in/prashant-ch265" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <Link href="/brand">Design notes</Link>
              </li>
            </ul>
          )}
        </div>
        {variant === "home" && (
          <p className="text-small site-footer__built" style={{ marginTop: "var(--space-4)" }}>
            Built with Next.js, NestJS, and a first-party diagram renderer — see{" "}
            <Link href="/brand">the design notes</Link>.
          </p>
        )}
      </Frame>
    </footer>
  );
}
