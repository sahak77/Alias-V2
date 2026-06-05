import { describe, it } from 'vitest';

const RUN_LIVE = process.env.RUN_LIVE_LLM === '1' || process.env.RUN_LIVE_LLM === 'true';

/**
 * Live provider contract test — GATED. Runs only in the nightly job under a tiny
 * spend cap (`RUN_LIVE_LLM=1 npm run test:llm`). Skipped by default so PRs cost $0.
 */
describe.skipIf(!RUN_LIVE)('LLM live contract', () => {
  it.todo('generates a schema-valid WordCard[] chunk from the real provider');
});
