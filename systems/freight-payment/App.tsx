/**
 * DEPRECATED — App.tsx was the entry point for the standalone Vite build.
 *
 * In the merged Next.js application the entry point is:
 *   app/freight-payment/page.tsx
 *
 * That file sets up QueryClientProvider + HashRouter + DashboardLayout directly,
 * and each route renders a page content component from pages/content/.
 *
 * This file is intentionally kept as an empty stub so that any stale tooling
 * reference does not crash the build.
 */

export {};
