import { Suspense } from 'react';
import { io } from 'next/cache';
import { listMessages } from './store';
import Thread from './Thread';

export default function UseOptimisticPage() {
  return (
    <div>
      <h1>useOptimistic — Optimistic UI</h1>
      <p>
        Sending a message takes ~1.2s server-side (simulated latency). Send a normal message and watch
        it appear <em>immediately</em>, dimmed, before the server confirms. Send a message containing the
        word &quot;fail&quot; to see the optimistic entry get reverted when the server rejects it instead.
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16, maxWidth: 480 }}>
        <Suspense fallback={<p>Loading thread...</p>}>
          <ThreadLoader />
        </Suspense>
      </section>
    </div>
  );
}

async function ThreadLoader() {
  await io();
  const messages = listMessages();
  return <Thread messages={messages} />;
}
