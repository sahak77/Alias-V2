import { QueryClient } from '@tanstack/react-query';

/** App-wide TanStack Query client. All server state flows through this. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
