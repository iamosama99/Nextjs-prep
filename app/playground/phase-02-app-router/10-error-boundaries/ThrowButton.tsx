'use client';

import { useState } from 'react';

export default function ThrowButton() {
  const [shouldThrow, setShouldThrow] = useState(false);

  // Error boundaries only catch errors thrown during rendering -- not inside an event
  // handler directly. So the click sets state, and the throw happens on the next render.
  if (shouldThrow) {
    throw new Error('Deliberate demo error from ThrowButton');
  }

  return <button onClick={() => setShouldThrow(true)}>Click to throw an error</button>;
}
