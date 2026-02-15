# WCAG Learn Product Requirements Document (PRD)

Version: 1.0
Date: 2026-02-13
Author: Justin Salas

## 1. Overview
WCAG Learn is an interactive, user-friendly flashcard web application designed to help users practice, memorize, and reference WCAG 2.2 Level A and AA success criteria.

Primary purposes:
- A structured study tool
- A quick-reference guide for auditors
- A professional learning tool for accessibility practitioners

The interface must itself model WCAG-friendly behavior.

## 2. Scope
### 2.1 Included in v1.0
- Single-page learning interface
- Flashcard study system
- Start in Order mode
- Start Random mode
- Sidebar navigation organized by POUR
- Full keyboard accessibility
- Local JSON dataset (Level A + AA)
- Free-tier deployment

### 2.2 Excluded in v1.0
- User accounts
- Saved progress
- Quizzes
- Analytics
- AAA criteria
- External integrations

## 3. Core App Behavior
### 3.1 Initial Load State
- No session memory
- No saved position
- App always loads fresh

Visible on load:
- Face-down card deck with product name
- Two start buttons:
  - Start in Order
  - Start Random Order
- Navigation arrows hidden until a start action

## 4. Flashcard System
### 4.1 Card Layout
Above the card:
- Principle name in ALL CAPS
- Centered above card

Front of card:
- Success criterion number emphasized
- Success criterion title bold
- Description centered
- Description style targets:
  - 18px text size
  - max width 500-600px
  - 32px internal padding
  - line-height 1.5

Back of card:
- Example image area scaled to available space
- Preserves aspect ratio
- Solid outline highlight area
- Flip animation requirements:
  - left-to-right
  - 300ms
  - constant speed

Caption card:
- Positioned to the right of main card
- White background, black text
- Slightly smaller text than main card
- Rounded edges
- Darker border/shadow

## 5. Navigation Controls
### 5.1 Arrow Buttons
- Circular buttons
- Left arrow centered between sidebar and card
- Right arrow centered between card and page edge
- Labels underneath: Back / Next
- Border aligns with sidebar border style
- Hover: outer glow only
- Focus: visible green outline

## 6. Sidebar (POUR Navigation)
### 6.1 Structure
- Left vertical rail (~20% width)
- Organized by:
  - Perceivable
  - Operable
  - Understandable
  - Robust

### 6.2 Expand/Collapse
- Arrow icon left of principle name
- Short dropdown animation
- Arrow rotates to indicate state

### 6.3 Criteria Rows
- 12px vertical spacing
- Active criterion has a solid highlight block behind text
- Active state preserves strong contrast

## 7. Visual Design System
### 7.1 Typography
- Font family: Trebuchet
- Main text: 18px
- Sidebar text: 16px
- Titles bold
- Principle labels in ALL CAPS

### 7.2 Colors
- Background: very dark gray
- Primary text: soft off-white
- Accent: green (focus and interaction)
- Sidebar divider: 1.5px

### 7.3 Elevation
- Subtle shadow on active card

## 8. Accessibility Requirements
- Full keyboard operability
- Visible focus states
- No keyboard traps
- Strong contrast in highlight states
- Programmatically accessible labels
- Example image areas include appropriate alt text

## 9. Technical Architecture
- Next.js + TypeScript
- Local JSON dataset
- No backend

## 10. Dataset Specification
- Includes Level A and Level AA criteria
- Excludes AAA
- Data shape:
  - `id`
  - `title`
  - `level` (`A` | `AA`)
  - `principle` (`Perceivable` | `Operable` | `Understandable` | `Robust`)
  - `shortExplanation`

## 11. Acceptance Criteria (v1)
- Fresh load shows deck + start buttons
- In Order starts at 1.1.1
- Random starts shuffled
- Sidebar highlight stays synced with active card
- Flip works smoothly
- Keyboard access works for all controls
- Dataset is loaded from local JSON
