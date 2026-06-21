---
name: RTL/LTR language switch chart crash
description: Why toggling Arabic<->English could blank the app, and the fix pattern
---

# Language switch (Arabic <-> English) blanking the app

Toggling language could throw during render and blank the whole screen.

**Root causes (two compounding):**
1. recharts v3 mis-handles *dynamically flipping* axis props on the same chart
   instances — `XAxis reversed` and `YAxis orientation` (left<->right) change
   when `isArabic` flips. Reconciling these in place can throw.
2. There was no React error boundary, so a single render throw took down the
   entire app (white screen), which the user perceived as "error switching".

**Fix pattern:**
- Force the chart subtree to fully remount on language change with a `key`
  derived from the language (e.g. `key={isArabic ? 'charts-ar' : 'charts-en'}`)
  on `<DashboardCharts/>` instead of letting recharts reconcile flipped axis props.
- Keep a top-level `ErrorBoundary` (class component) wrapping the app so any
  future render throw degrades to a graceful bilingual fallback, not a blank page.

**How to apply:** Any third-party widget (charts, maps) whose props flip with
direction/locale — prefer a remount `key` over in-place prop mutation. Never ship
this app without the root ErrorBoundary.
