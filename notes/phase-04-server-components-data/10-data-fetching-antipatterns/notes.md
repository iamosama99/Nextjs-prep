# Common Data-Fetching Antipatterns Interviewers Probe For

**Demo:** None — this is a synthesis pass over Topics 1–9, each of which has its own live demo already. This topic is the checklist you'd actually use reviewing a PR or answering a "what's wrong with this code" interview question.

## Quick Reference

| Antipattern | The tell | The fix |
|---|---|---|
| Accidental waterfall | Sequential `await`s with no real dependency | `Promise.all` after calling both functions (Topic 5) |
| Over-clienting | Data fetched in a `useEffect` that could've run server-side | Fetch in the Server Component ancestor, pass down (Topics 1, 4) |
| Raw row passed to a Client Component | Prop type is the whole DB row/API response | A DAL returning a minimal DTO (Topic 8) |
| One giant Suspense boundary | The whole page shows one spinner | Granular, per-section boundaries pushed down (Topic 6) |
| No Suspense boundary at all | Build fails with `blocking-prerender-dynamic` | Wrap the actual dynamic access, not the whole page (Phase 3, Topic 2) |
| Mixed data-fetching approaches | Some components hit the DB directly, others call HTTP APIs, no pattern | Pick one approach consistently (Topic 4) |

## Where Does This Run?

Nowhere new — every antipattern here is a misapplication of a mechanism Topics 1–9 already covered correctly. This topic's job is naming the *wrong* version of each, since interviews often present broken code and ask what's wrong, not ask you to recite the correct API from scratch.

## What Is This?

A catalog of the specific mistakes that show up repeatedly in real codebases and in "spot the bug" interview questions, organized by which earlier topic's correct pattern they violate. Each entry below follows the same shape: what the broken code looks like, why it's a genuine problem (not just a style preference), and the fix — all pointing back to a topic that covers the mechanism in full.

## The Antipatterns

### 1. The accidental waterfall (violates Topic 5)

```tsx
const artist = await getArtist(id)
const albums = await getAlbums(id) // doesn't need artist — but waits anyway
```

**Why it's wrong:** Two independent 200ms calls become 400ms of sequential latency for no reason. **The fix:** call both without awaiting, then `Promise.all`. **The trap for reviewers:** not every sequential pair is this bug — check whether the second call actually uses the first's result before flagging it.

### 2. Over-clienting: fetching client-side what could've been server-side (violates Topics 1, 4)

```tsx
'use client'
function Page() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch('/api/data').then(r => r.json()).then(setData) }, [])
  // ...
}
```

**Why it's wrong:** This adds a full extra round trip (render empty, then fetch, then render again) for data that could have been fetched directly in a Server Component ancestor and included in the very first response — plus it ships a data-fetching `useEffect` and all its dependencies to the client for no reason. **The fix:** fetch in a Server Component and pass the result down as props, or via `use()` if it needs to stream (Topic 3). Client-side fetching remains correct when the data is genuinely user-interaction-driven (search-as-you-type, a value that depends on client-only state) — the antipattern is defaulting to it out of habit for data that was available at request time regardless of client interaction.

### 3. Passing a raw row instead of a DTO (violates Topic 8)

```tsx
const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`
return <Profile user={rows[0]} /> // ships every column, including passwordHash
```

**Why it's wrong:** Serializable isn't the same as safe — every field crosses to the browser whether or not the UI displays it. **The fix:** a DAL function returning only the fields actually needed, and a narrow prop type on the receiving Client Component that makes over-passing a type error rather than a habit.

### 4. One Suspense boundary around everything (violates Topic 6)

```tsx
<Suspense fallback={<FullPageSpinner />}>
  <Header /><MainContent /><Sidebar /><Footer />
</Suspense>
```

**Why it's wrong:** Technically streams, technically passes Cache Components validation — but the *entire* page waits for the slowest of these four sections, defeating the actual point of granular streaming (Header and Footer likely have no async dependency at all and could ship instantly). **The fix:** boundaries scoped to the components that actually do async work, not one boundary wrapping unrelated static and dynamic content together.

### 5. No Suspense boundary at all (violates Phase 3, Topic 2 and this phase's Topic 4)

```tsx
export default async function Page() {
  const data = await getData() // uncached, unguarded
  return <div>{data}</div>
}
```

**Why it's wrong:** Under Cache Components, this fails the build outright (`blocking-prerender-dynamic`) rather than silently working — Topic 4's demo hit exactly this. **The fix:** wrap the fetching component in `<Suspense>`, or cache the function with `"use cache"` if the data can be shared (Phase 3, Topic 5) — not `export const instant = false` as a default habit, which defers the problem rather than solving it (Phase 3, Topic 11).

### 6. Inconsistent data-fetching approach across a codebase (violates Topic 4)

Some components call `db.query(...)` directly, others call an internal HTTP API, others go through a DAL — with no consistent rule for which situation calls for which. **Why it's wrong:** there's no single place to audit for authorization correctness, and the inconsistency itself is a signal that data-access decisions were made ad hoc rather than deliberately. **The fix:** pick one approach (a DAL, for most new projects) and apply it consistently, per Topic 4's explicit recommendation to avoid mixing.

### 7. Forgetting non-`fetch` sources need explicit memoization (violates Topics 3–4)

```tsx
async function Header() { const user = await db.user.find(id); /* ... */ }
async function Sidebar() { const user = await db.user.find(id); /* ... */ } // re-queries, unmemoized
```

**Why it's wrong:** `fetch` calls get automatic Request Memoization; a raw ORM/database call does not — two components independently calling the same query run it twice in the same render, unlike the equivalent `fetch` case. **The fix:** wrap the query in `React.cache()` (Phase 3, Topic 4; this phase's Topic 4 DAL example) so multiple call sites in one render share a single execution.

### 8. Awaiting a runtime value at the top of a layout, blocking every descendant (violates Topic 6's "push down" pattern)

```tsx
export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies() // blocks children and Nav both
  return <div><Nav theme={cookieStore.get('theme')} />{children}</div>
}
```

**Why it's wrong:** this makes the *entire* layout (and everything under it) dynamic, when only the piece reading the cookie actually needs to be. **The fix:** don't await at the top; pass the promise down to a `<Suspense>`-wrapped leaf component that reads it, leaving `{children}` and the rest of `Nav` in the static shell.

### 9. An LCP element wrapped in Suspense out of habit (violates Topic 6's Web Vitals guidance)

```tsx
<Suspense fallback={<Skeleton />}>
  <HeroImage /> {/* the page's actual LCP element */}
</Suspense>
```

**Why it's wrong:** this delays the page's Largest Contentful Paint until the boundary resolves and its swap script runs — actively working against the metric it's often (wrongly) assumed to help. **The fix:** keep LCP elements outside/above Suspense boundaries, in the static shell, and use `next/image`'s `preload` for LCP images specifically.

## Interview Questions

**Q (High): You're shown a component with `const [data, setData] = useState(null); useEffect(() => { fetch(...).then(setData) }, [])` inside a `'use client'` page that has no interaction-driven reason to be client-rendered. What's wrong, and how would you fix it?**

Answer: This fetches client-side data that could have been fetched server-side in a Server Component ancestor, adding an unnecessary round trip (empty initial render, then a fetch, then a re-render with data) and shipping fetch/effect logic to the client bundle for no reason. The fix is moving the fetch into a Server Component — either the page itself (if it doesn't need other client-only state) or an ancestor that passes the result down as a prop or an unresolved promise (Topic 3's `use()` pattern) if the specific component still needs `'use client'` for other reasons.

The trap: reflexively saying "convert everything to Server Components" without checking whether the component's `'use client'` status is actually justified by something else (event handlers, local UI state) — the fix is specifically about *where the fetch happens*, not necessarily eliminating the Client Component boundary entirely.

**Q (High): A code review shows a Server Component passing an entire ORM query result object directly to a Client Component as a `user` prop, where the Client Component only renders the user's display name. What's the concern, and is it a type error or a runtime error?**

Answer: It's neither, by default — it's a silent overexposure. The object is fully serializable (plain fields), so it compiles and runs fine, but every field in it, including ones like a password hash or internal flags that were never meant to leave the server, ships to the browser via the RSC Payload regardless of what the UI actually displays. The concern only becomes a visible error if you additionally tighten the Client Component's prop type to just what it needs (`{ name: string }`) — at that point, passing the full object becomes a type error, which is precisely the recommended fix: narrow the prop type and shape the data (via a DAL/DTO) before it's ever passed.

The trap: assuming there must be a build-time or runtime failure signaling this problem — there usually isn't, which is exactly why it's a dangerous, easy-to-miss antipattern rather than an obvious bug.

**Q (Medium): A dashboard page wraps its entire content — header, sidebar, and four independent data widgets — in a single `<Suspense>` boundary with one full-page skeleton fallback. Does this pass Cache Components' validation? Is it still a problem?**

Answer: It likely passes validation — a single boundary high enough in the tree is a legitimate way to satisfy "there's a Suspense boundary somewhere above the dynamic work." But it's still a real problem: the entire page, including genuinely static content like the header, now waits behind the *slowest* of the four widgets before showing anything, when several of those widgets could have streamed in independently and immediately. Passing validation confirms the route is structurally instant-capable; it says nothing about whether the loading experience is actually good (Phase 3, Topic 12 covers exactly this "passes validation but the shell is a bad user experience" distinction).

The trap: treating "the build passes" as equivalent to "this is well-optimized" — Topic 6 and Phase 3 Topic 12 both explicitly warn against conflating the two.

**Q (Medium): Two sibling components both call the same non-`fetch` database query function directly (`await db.user.find(id)`), with no `React.cache()` wrapping. What happens, and how does this differ from doing the same thing with `fetch`?**

Answer: The query runs twice — once per component — in the same render pass, because Request Memoization (automatic deduplication) is specific to `fetch`; a raw database call gets no such treatment on its own. The equivalent `fetch`-based code would have been automatically deduplicated to one actual network call. The fix is wrapping the query function in `React.cache()`, which is the general-purpose version of the same dedupe behavior, applicable to any async function, not just `fetch`.

The trap: assuming all "data fetching" in Server Components gets memoization for free — it's specifically a `fetch` behavior; everything else requires the explicit `React.cache()` opt-in.

**Q (Low): A team's codebase has some pages calling the database directly, others going through a documented Data Access Layer, and no consistent rule for which is used where. Is this primarily a performance problem or something else?**

Answer: Primarily a maintainability and security-auditing problem, not a performance one. The inconsistency means there's no single place to verify that authorization checks are applied consistently — a reviewer (or an actual security audit) has to check every component individually rather than being able to trust that all data access flows through one audited layer. Next.js's own guidance is to pick one of the three approaches (HTTP APIs, DAL, component-level) and apply it consistently specifically for this reason.

The trap: focusing only on performance-flavored antipatterns (waterfalls, missing memoization) and missing that "inconsistent architecture" is itself a named antipattern with its own distinct cost.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can identify an accidental waterfall in a code sample and name the `Promise.all` fix
- [ ] Can identify unnecessary client-side fetching and explain why it costs a round trip
- [ ] Can identify a raw-row-to-Client-Component leak and explain why it isn't a build/runtime error
- [ ] Can distinguish "passes validation" from "good loading experience" for Suspense boundary placement
- [ ] Can explain why non-`fetch` data sources need explicit `React.cache()` to get the same dedupe `fetch` gets automatically

---

## Phase 4 Complete

This phase covered the Server/Client Component model as it actually works in Next.js: the module-graph split and the RSC Payload (Topics 1–2), composition patterns including the `children`-as-slot trick and Context (Topic 3), the mechanics and timing of data fetching (Topics 4–6), the enforcement tools that make server/client discipline a build-time guarantee rather than a hope (Topics 7–8), the concrete third-party-library pattern that applies all of it (Topic 9), and this closing catalog of what goes wrong when any of it is misapplied. Every topic with a runtime claim was verified against a real running server — including two genuine build-error exercises deliberately triggered and confirmed (Topics 2, 7, 8, 9) and one case (Topic 6) where `curl` was deliberately *not* used, in favor of a raw stream-reading script, precisely because this phase's own material explains why `curl` would have given a misleading answer.

*Next: Phase 5 — Server Actions & Mutations, which builds directly on this phase's server/client boundary work (Server Functions crossing as references, Topic 8) to cover how data actually gets written, not just read.*
