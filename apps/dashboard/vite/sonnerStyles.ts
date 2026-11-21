import type { Plugin } from "vite";

/**
 * Keeps sonner working under the CSP.
 *
 * sonner adds its stylesheet at runtime as a <style> element, which
 * `style-src 'self'` blocks, so toasts would render unstyled. src/index.css
 * bundles sonner's CSS instead, and this plugin removes the runtime injection
 * from the production build. The build fails if a sonner upgrade changes how
 * it injects, rather than shipping blocked styles again. The dev server sends
 * no CSP, so the plugin applies to builds only.
 */
export function sonnerStyles(): Plugin {
  return {
    name: "codexa:sonner-styles",
    apply: "build",
    transform(code, id) {
      if (!/[\\/]sonner[\\/]dist[\\/]index\.mjs$/.test(id)) return;
      const next = code.replace(/__insertCSS\("(?:[^"\\]|\\.)*"\);?/, "");
      if (next === code) this.error("sonner changed how it injects styles. Update vite/sonnerStyles.ts.");
      return { code: next, map: null };
    },
  };
}
