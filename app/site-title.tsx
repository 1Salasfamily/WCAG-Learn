"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCKUP } from "./lockup.generated";

export default function SiteTitle() {
  const pathname = usePathname();

  function handleClick() {
    // From /about or /accessibility the Link navigates to "/" and the study
    // page mounts fresh on the start screen. When already on "/", that same-
    // route navigation won't reset state, so ask the page to return to start.
    if (pathname === "/") {
      window.dispatchEvent(new Event("wcag-learn:home"));
    }
  }

  return (
    <Link
      className="site-title-link"
      href="/"
      aria-label="WCAG Learn — go to start page"
      onClick={handleClick}
    >
      {/* Inlined rather than an <img> so the wordmark can recolour with the
          theme; the link's aria-label carries the accessible name, so the
          drawing itself is hidden from the tree. */}
      <span
        className="site-logo site-lockup"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: LOCKUP }}
      />
    </Link>
  );
}
