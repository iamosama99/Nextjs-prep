'use client';

import { incrementFromOnClick } from './actions';

// Not a <form> at all — an event handler calling a Server Function directly.
// There is no HTML fallback for a click event; this structurally cannot work
// before React has hydrated and attached the listener.
export default function OnClickButton() {
  return <button onClick={() => incrementFromOnClick()}>Increment (onClick, no form)</button>;
}
