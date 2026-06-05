import { http, HttpResponse } from 'msw';

/**
 * MSW handlers for the LLM provider (record/replay seam). Real fixtures land with
 * the generation proxy so PRs cost $0 (no live provider calls). Placeholder for now.
 */
export const handlers = [
  http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({ stub: true }, { status: 200 }),
  ),
];
