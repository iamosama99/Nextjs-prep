'use client';

// The wrapper: source of the "third-party" component is untouched — this
// file is the one place the boundary is declared, so a Server Component can
// import THIS instead of the library directly.
export { ThirdPartyCounter } from './fake-library';
