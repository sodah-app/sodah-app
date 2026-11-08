"use client";

import SodahWorkspaceShell from "@/components/SodahWorkspaceShell";

export default function SodahWorkspaceClient({
  children,
}) {
  return (
    <SodahWorkspaceShell>
      {children}
    </SodahWorkspaceShell>
  );
}