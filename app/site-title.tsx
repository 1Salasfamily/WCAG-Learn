"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <img
        className="site-logo"
        src="/wcag-learn-lockup-dark.svg"
        alt=""
        width={130}
        height={34}
      />
    </Link>
  );
}
