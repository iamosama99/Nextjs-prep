// The Web ReadableStream API directly — no React, no Suspense, no RSC
// involved. This is a different kind of "streaming" from Phase 3/4's
// Suspense-based UI streaming: raw bytes to whatever client is reading them,
// not HTML chunks React assembles.
function iteratorToStream(iterator: AsyncGenerator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const encoder = new TextEncoder();

async function* makeIterator() {
  yield encoder.encode('one\n');
  await sleep(500);
  yield encoder.encode('two\n');
  await sleep(500);
  yield encoder.encode('three\n');
}

export async function GET() {
  const stream = iteratorToStream(makeIterator());
  return new Response(stream);
}
