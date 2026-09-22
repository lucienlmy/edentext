// harper.js never settles setup() when its worker dies; the singleton has to notice
// the worker's error itself, report it and put the toggle back off.
import { describe, it, expect, vi } from 'vitest';

const { worker, reported } = vi.hoisted(() => ({ worker: new EventTarget(), reported: [] as unknown[] }));
vi.mock('harper.js', () => ({
  WorkerLinter: class {
    worker = Object.assign(worker, { terminate: vi.fn() });
    setup = () => new Promise(() => {});
  },
}));
vi.mock('harper.js/binary', () => ({ binary: {} }));
vi.mock('../../src/lib/utils/loadFailure', () => ({
  reportLoadFailure: (_what: string, err: unknown) => reported.push(err),
}));

const { setGrammarEnabled, grammarEnabled, grammarLoading } = await import('../../src/lib/spell/grammar.svelte');

describe('grammar engine load', () => {
  it('reports a worker that dies during setup and switches back off', async () => {
    setGrammarEnabled(true);
    expect(grammarLoading()).toBe(true);
    // The listener goes on once the dynamic import is in, so keep firing until it hears.
    await vi.waitFor(() => {
      worker.dispatchEvent(Object.assign(new Event('error'), { message: 'blocked by CSP' }));
      expect(grammarLoading()).toBe(false);
    });
    expect((reported[0] as Error).message).toBe('blocked by CSP');
    expect(grammarEnabled()).toBe(false);
    expect((worker as unknown as { terminate: () => void }).terminate).toHaveBeenCalled();
  });
});
