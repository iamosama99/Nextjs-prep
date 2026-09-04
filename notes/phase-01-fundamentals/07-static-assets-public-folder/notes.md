# Static Assets & the `public/` Folder

## Quick Reference

| You want | Use `public/` | Import the asset in code instead |
|---|---|---|
| A stable, predictable URL (favicon, downloadable PDF, `.well-known/` verification file) | ✅ | ❌ |
| Automatic content-hash cache busting on change | ❌ | ✅ |
| The bundler to fail the build if the file is missing | ❌ | ✅ (import error) |
| To reference it from `next/image` for optimization | ✅ (still works, pass the path) | ✅ |

## Where Does This Run?

Build/deploy time only — files in `public/` are copied as-is into the output and served directly by the server (or CDN) at the site root. No bundler processing, no React involved.

## What Is This?

Anything placed in `public/` at the project root is served from `/` verbatim — `public/robots.txt` becomes `https://yoursite.com/robots.txt`, `public/logo.png` becomes `/logo.png`. You reference it by a plain string path (`<img src="/logo.png" />`), not an import statement — there is no build step transforming these files at all.

> **Check yourself:** What's the actual URL a request would use to reach `public/favicon.ico`? Does the word "public" appear in it?

## Why Does It Exist?

Some assets *need* a fixed, predictable path that survives rebuilds untouched: `robots.txt` and `favicon.ico` are expected at exact, well-known URLs by browsers and crawlers; domain-verification files (e.g., for Google Search Console) must sit at an exact path the verifying service dictates; a downloadable PDF's URL might be linked from external marketing material and can't shift every deploy. Importing an asset into a component, by contrast, is right when you want the bundler to fingerprint the file (cache-bust automatically on change) and fail loudly if the reference is broken — the two mechanisms solve opposite problems and Next.js deliberately keeps both available.

## How It Works

Files in `public/` bypass the JavaScript/CSS bundling pipeline entirely — they're static files copied into the build output and served by the same server (or handed to a CDN) alongside your app's routes. Referencing one is just a string:

```tsx
export default function Logo() {
  return <img src="/logo.png" alt="Logo" />;
}
```

This also composes with `next/image` (Phase 8) — you can pass a `public/`-relative path as the `src`, and Next's image optimization pipeline still runs on it at request/build time; `public/` only means "skip the JS bundler," not "skip every Next.js feature."

## Gotchas

- **No automatic cache-busting.** An imported asset gets a content hash in its filename so browsers safely cache it forever and instantly get the new version on change; a `public/` file's URL never changes on its own, so if you serve it with long-lived cache headers and then update its content, clients can keep the stale version until the cache expires. This is a deliberate tradeoff for the fixed-URL guarantee, not an oversight — it means cache headers for `public/` assets need to be chosen deliberately (short TTL, or a manually versioned filename, for anything that changes).
- **Silent broken references.** Typo the path to a `public/` file and nothing fails at build time — you just get a 404 at runtime, unlike an import, which errors immediately if the file doesn't exist.
- **Route/filename collisions.** A file at `public/settings` could shadow or conflict with an app route at `/settings` depending on match order — an easy source of "why is my page not rendering" confusion in a codebase where both exist.

## Interview Questions

**Q (High): How is putting an asset in `public/` fundamentally different from importing it directly into a component?**

Answer: `public/` files are served as-is at a fixed, predictable URL with zero bundler processing — no content hashing, no build-time existence check. Imported assets go through the bundler, get a content hash appended to their filename for automatic cache-busting, and produce a build error if the referenced file is missing. Use `public/` when the URL itself needs to be stable and externally referenceable (favicon, robots.txt, a linked PDF); use an import when you want cache safety and compile-time correctness checking.

The trap: treating them as interchangeable "just put images somewhere" options without naming the cache-busting and fail-fast tradeoffs.

**Q (Medium): What are the caching implications of an unfingerprinted `public/` asset, and how would you handle updating one in production?**

Answer: Because the URL never changes when the file's content changes, aggressive cache headers (`Cache-Control: max-age=31536000, immutable`, the pattern typically used for fingerprinted bundle assets) are unsafe to apply blindly to `public/` files — a client could keep serving stale content well past the update. The common fixes are either a shorter, deliberately-chosen cache TTL for anything expected to change, or manually versioning the filename (`logo-v2.png`) when an update needs to bypass caches immediately.

The trap: applying the same "cache forever" mental model used for bundled assets to `public/` files without noticing the fingerprinting guarantee is missing.

**Q (Medium): Can a file in `public/` collide with a route defined in `app/`? What would that look like?**

Answer: Yes — if `public/settings` (a file, no extension) and `app/settings/page.tsx` (a route) both effectively map to `/settings`, there's a naming collision, and depending on the exact paths involved this manifests as unexpected behavior (one shadowing the other) rather than an explicit build error in every case. In practice this is avoided by keeping `public/` reserved for genuinely static files (images, fonts, `robots.txt`) with extensions, and letting `app/` own all route-like paths.

The trap: assuming Next.js validates and prevents this collision automatically — being static files, `public/` isn't route-aware at all.

**Q (Low): Where would you put `robots.txt` — statically in `public/`, or via the `robots.ts` file convention — and why might you choose one over the other?**

Answer: `public/robots.txt` is simplest when the content is fixed and never needs to vary. The `app/robots.ts` convention (Phase 8) is preferable when the content needs to be generated dynamically — e.g., different rules per environment (blocking crawlers entirely on a staging deployment) — since it's actual code that runs and can branch on environment variables, whereas a `public/` file is always the same static bytes.

The trap: not knowing the code-based convention exists at all, or picking it by default even when a static file would be simpler.

---

## Self-Assessment

- [ ] Can state the exact URL mapping rule for `public/` files without notes
- [ ] Can explain why `public/` assets aren't automatically cache-busted, and what that implies for cache headers
- [ ] Knows importing an asset vs. referencing it from `public/` are different mechanisms with different failure modes
- [ ] Can describe a realistic route/filename collision scenario between `public/` and `app/`
- [ ] Can articulate when `robots.ts`/`sitemap.ts` beat a static `public/` file

---
*Next: Next.js versioning & the React version it ships with — why upgrading Next.js is rarely "just a patch bump" the way it is for most libraries built on top of React.*
