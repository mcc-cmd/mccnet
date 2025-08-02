import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../../../shared/schema';

interface AuthState {
  user: AuthResponse['user'] | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  login: (credentials: { username: string; password: string }) => Promise<boolean>;
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
          // 먼저 관리자/근무자 로그인 시도
          let response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          let data: AuthResponse | null = null;

          if (response.ok) {
            data = await response.json();
            if (data.success && data.user && data.sessionId) {
              set({
                user: data.user,
                sessionId: data.sessionId,
                isAuthenticated: true,
              });
              return true;
            }
          }

          // 관리자/근무자 로그인이 실패하면 영업과장 로그인 시도
          response = await fetch('/api/auth/manager-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          if (response.ok) {
            data = await response.json();
            if (data.success && data.user && data.sessionId) {
              // 영업과장 로그인 성공 시 zustand 상태 설정
              set({
                user: data.user,
                sessionId: data.sessionId,
                isAuthenticated: true,
              });
              return true;
            }
          }

          // 모든 로그인 시도 실패
          const errorData = await response.json().catch(() => ({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }));
          throw new Error(errorData.error || '아이디 또는 비밀번호가 올바르지 않습니다.');

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
        if (!sessionId) {
          set({
            user: null,
            sessionId: null,
            isAuthenticated: false,
          });
          return false;
        }

        try {
          console.log('Checking auth with sessionId:', sessionId ? 'exists' : 'missing');
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionId}`,
            },
          });

          console.log('Auth check response:', response.status, response.ok);

          if (response.ok) {
            const data: AuthResponse = await response.json();
            console.log('Auth check data:', data);
            if (data.success && data.user) {
              set({
                user: data.user,
                isAuthenticated: true,
              });
              return true;
            }
          } else {
            console.log('Auth check failed:', response.status);
          }
          
          // 인증 실패 시에만 세션 정보 삭제
          if (response.status === 401) {
            set({
              user: null,
              sessionId: null,
              isAuthenticated: false,
            });
          }
          return false;
        } catch (error) {
          console.error('Auth check error:', error);
          // 네트워크 오류 시에는 세션 정보를 유지
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
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only add Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response:', {
      url,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      console.error('API request failed:', {
        url,
        status: response.status,
        statusText: response.statusText
      });
      const errorData = await response.json().catch(() => ({ error: '요청에 실패했습니다.' }));
      const error = new Error(errorData.error || '요청에 실패했습니다.') as any;
      // 상세 정보를 에러 객체에 포함
      error.details = errorData.details;
      error.totalErrors = errorData.totalErrors;
      error.addedCodes = errorData.addedCodes;
      throw error;
    }

    return response.json();
  };

  return apiRequest;
};
