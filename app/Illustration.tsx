"use client";

import { useEffect, useState } from "react";

// The criterion illustration, inlined into the DOM.
//
// As an <img>, each SVG is an isolated document that cannot see the page's
// theme attribute, so it could only ever follow the operating system.
// Inlined, its fills and strokes are ordinary DOM attributes that the
// stylesheet recolours under [data-theme="light"]. The 56 drawings live in
// one generated module loaded on first use, so the main bundle does not
// carry them and card-to-card changes after that are instant.
//
// The wrapper carries the accessible name; the drawings themselves ship
// with no role or aria-hidden, stripped by the generator.

type IllustrationMap = Record<string, string>;

let cache: IllustrationMap | null = null;
let pending: Promise<IllustrationMap> | null = null;

function loadAll(): Promise<IllustrationMap> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import("./illustrations.generated").then((mod) => {
      cache = mod.ILLUSTRATIONS;
      return cache;
    });
  }
  return pending;
}

type IllustrationProps = {
  id: string;
  label: string;
  className?: string;
};

export default function Illustration({ id, label, className }: IllustrationProps) {
  const [svg, setSvg] = useState<string | null>(() =>
    cache ? (cache[id] ?? null) : null
  );

  useEffect(() => {
    let live = true;
    loadAll().then((map) => {
      if (live) setSvg(map[id] ?? null);
    });
    return () => {
      live = false;
    };
  }, [id]);

  // Before the chunk arrives (first card of a session only) the shell keeps
  // its 16:9 height, so nothing shifts when the drawing lands.
  return (
    <div
      className={`illustration ${className ?? ""}`}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
