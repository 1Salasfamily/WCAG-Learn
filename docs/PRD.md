# WCAG Learn PRD (v1.0)

## Overview
WCAG Learn is an interactive web app to help users practice and reference WCAG 2.2 criteria using a flashcard learning model.

## Product Goals
- Provide a structured WCAG study experience.
- Offer quick reference support for audits.
- Keep the interface itself accessibility-first.

## v1 Scope
- Single-page learning interface.
- Start in order and start random modes.
- Sidebar navigation grouped by POUR principles.
- Keyboard-accessible interaction and visible focus indicators.
- Local JSON dataset.

## Out of Scope (v1)
- User accounts.
- Progress persistence.
- Analytics.
- Third-party integrations.

## Accessibility Requirements
- Keyboard operability for all controls.
- Visible focus styles.
- No keyboard traps.
- Semantic structure and labels suitable for screen readers.

## Data Shape
Each criterion item contains:
- `id`
- `title`
- `level` (`A` or `AA`)
- `principle` (`Perceivable`, `Operable`, `Understandable`, `Robust`)
- `shortExplanation`

## Implementation Note
This repository is initialized with a minimal Next.js App Router foundation and sample dataset to support incremental implementation.
