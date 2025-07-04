import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../../../shared/schema';

interface AuthState {
  user: AuthResponse['user'] | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionId: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const data: AuthResponse = await response.json();

          if (data.success && data.user && data.sessionId) {
            set({
              user: data.user,
              sessionId: data.sessionId,
              isAuthenticated: true,
            });
            return true;
          } else {
            throw new Error(data.error || '로그인에 실패했습니다.');
          }
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      logout: async () => {
        const { sessionId } = get();
        if (sessionId) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionId}`,
              },
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        set({
          user: null,
          sessionId: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const { sessionId } = get();
        if (!sessionId) return false;

        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionId}`,
            },
          });

          if (response.ok) {
            return true;
          } else {
            set({
              user: null,
              sessionId: null,
              isAuthenticated: false,
            });
            return false;
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({
            user: null,
            sessionId: null,
            isAuthenticated: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Custom hook for API requests with authentication
export const useApiRequest = () => {
  const sessionId = useAuth((state) => state.sessionId);

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '요청에 실패했습니다.' }));
      throw new Error(error.error || '요청에 실패했습니다.');
    }

    return response.json();
  };

  return apiRequest;
};
