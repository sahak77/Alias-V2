import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW node server — start/stop in test lifecycle hooks once the LLM path is tested. */
export const server = setupServer(...handlers);
