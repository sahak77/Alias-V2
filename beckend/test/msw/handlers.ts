import { http, HttpResponse } from 'msw';

/**
 * MSW handler for the Anthropic Messages API (the default $0 mock — no live calls).
 * Returns a forced `tool_use` response shaped like the real API, with 28 valid unique
 * cards plus a duplicate and an invalid card so the LlmClient's Zod re-validate +
 * dedupe + cap path is exercised end-to-end.
 */
const cards = [
  ...Array.from({ length: 28 }, (_, i) => ({ w: `word${i + 1}`, d: `clue ${i + 1}` })),
  { w: 'word1' }, // duplicate — deduped by the client
  { d: 'no word field' }, // invalid — dropped by the Zod re-validate
];

export const handlers = [
  http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-4-5',
      content: [{ type: 'tool_use', id: 'toolu_test', name: 'emit_word_cards', input: { cards } }],
      stop_reason: 'tool_use',
      stop_sequence: null,
      usage: { input_tokens: 320, output_tokens: 540 },
    }),
  ),
];
