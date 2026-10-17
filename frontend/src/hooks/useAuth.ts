import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, logout as apiLogout } from '../api/endpoints';
import { User } from '../types/api';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user: User | null = data?.user ?? null;

  const logout = async () => {
    await apiLogout();
    queryClient.clear();
    window.location.href = '/login';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout,
  };
}
