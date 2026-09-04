// The implicit "children" slot (app/page.tsx === app/@children/page.tsx) needs its
// own default.tsx too -- without it, a hard reload on /team-settings 404s the whole route,
// not just one region, since children has no matching sub-route for that URL.
export default function ParallelRoutesChildrenDefault() {
  return null;
}
