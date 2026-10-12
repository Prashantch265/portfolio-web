import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AdminLoginPage() {
  return (
    <div className="admin-root">
      <LoginForm />
    </div>
  );
}
