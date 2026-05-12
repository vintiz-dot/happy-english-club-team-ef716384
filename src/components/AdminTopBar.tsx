import { ReactNode } from "react";

interface Props {
  title?: string;
  rightSlot?: ReactNode;
}

/**
 * Stub AdminTopBar — placeholder header strip used by Layout.tsx until the
 * full breadcrumb + command-palette implementation is uploaded.
 */
export function AdminTopBar({ title, rightSlot }: Props) {
  return (
    <header className="hidden md:flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-foreground truncate">{title || ""}</h1>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </header>
  );
}

export default AdminTopBar;
