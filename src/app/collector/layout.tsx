"use client";

import { CollectorAuthProvider } from "@/context/CollectorAuthContext";

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CollectorAuthProvider>{children}</CollectorAuthProvider>;
}
