'use client';

import { useOptimistic, useState, useRef } from 'react';
import { send } from './actions';
import type { Message } from './store';

export default function Thread({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<Message[], string>(
    messages,
    (state, newText) => [...state, { id: `optimistic-${Date.now()}`, text: newText }]
  );
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // NOT a Server Action itself — a plain client function that calls one. This
  // is what makes the instant optimistic update possible, but it also means
  // this specific form no longer works with JavaScript disabled (Topic 8
  // covers why that tradeoff exists).
  async function formAction(formData: FormData) {
    const text = String(formData.get('message') ?? '');
    if (!text) return;

    setError(null);
    addOptimisticMessage(text);
    formRef.current?.reset();

    try {
      await send(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id} style={{ opacity: m.id.startsWith('optimistic-') ? 0.5 : 1 }}>
            {m.text}
            {m.id.startsWith('optimistic-') && ' (sending...)'}
          </li>
        ))}
      </ul>
      {error && <p style={{ color: '#e00' }}>{error}</p>}
      <form ref={formRef} action={formAction}>
        <input name="message" placeholder='Try "this will fail"' style={{ marginRight: 8 }} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
