import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useSession } from '@/stores/session';
import type { LoginInput } from '../schemas';

type LoginResponse = {
  token: string;
};

/** Logs the user in and persists the session token. */
export function useLogin() {
  const signIn = useSession((s) => s.signIn);

  return useMutation({
    mutationFn: (input: LoginInput) => apiClient.post<LoginResponse>('/auth/login', input),
    onSuccess: async ({ token }) => {
      await signIn(token);
    },
  });
}
