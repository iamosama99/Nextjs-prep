'use client';

import { createContext, useContext, type ReactNode } from 'react';

// React Context, unsupported directly inside Server Components — this
// wrapper is the standard fix: a Client Component owning the Provider,
// accepting the rest of the (still server-renderable) tree as children.
const ThemeContext = createContext('light');

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}

export function ThemeConsumer() {
  const theme = useContext(ThemeContext);
  return <p>Theme read from context (in a Client Component): <strong>{theme}</strong></p>;
}
