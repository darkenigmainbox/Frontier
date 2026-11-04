import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders children into <body> so fixed-position overlays escape any transformed ancestor. */
export function Portal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.body);
  }, []);
  if (!host) return null;
  return createPortal(children, host);
}
