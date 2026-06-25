import type { Metadata } from "next"

// The reset-password page is a "use client" component and can't export metadata
// itself, so this route-segment layout supplies it. The page is reached only
// via a tokenized link in a password-reset email — it has no public content and
// must never be indexed.
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
