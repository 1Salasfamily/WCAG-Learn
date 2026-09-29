"use client";

import { useEffect, useId, useState } from "react";

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
    pending = import("./illustrations.generated").then(
      (mod) => {
        cache = mod.ILLUSTRATIONS;
        return cache;
      },
      (error) => {
        // A failed chunk (flaky network, or a deploy replaced it) must not
        // stick for the session: clear it so the next card tries again.
        pending = null;
        throw error;
      }
    );
  }
  return pending;
}

type IllustrationProps = {
  id: string;
  label: string;
  className?: string;
};

export default function Illustration({ id, label, className }: IllustrationProps) {
  // Once the module is cached, the drawing is read during render, so a
  // change of id never paints the previous criterion's drawing first. The
  // state only exists to re-render when the first load lands.
  const [loaded, setLoaded] = useState<IllustrationMap | null>(cache);
  const map = cache ?? loaded;
  // The generator prefixes each drawing's internal ids (i2-4-3-g); the
  // card and the enlarged view can show the same drawing at once, so each
  // instance adds its own suffix and url(#…) resolves inside its own copy.
  const instance = useId().replace(/:/g, "");
  const scope = `i${id.replace(/\./g, "-")}-`;
  const raw = map ? (map[id] ?? null) : null;
  const svg = raw && raw.includes(scope) ? raw.split(scope).join(`${scope}${instance}-`) : raw;

  useEffect(() => {
    if (cache) return;
    let live = true;
    loadAll().then(
      (all) => {
        if (live) setLoaded(all);
      },
      () => {
        // Leave the empty 16:9 shell; the next card retries the load.
      }
    );
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
