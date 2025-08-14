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
          console.log('Attempting login with credentials');
          
          // 통합 로그인 API 호출 (관리자, 근무자, 영업과장 모두 처리)
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          console.log('Login response status:', response.status, response.ok);

          if (response.ok) {
            const data: AuthResponse = await response.json();
            console.log('Login response data:', data);
            
            if (data.success && data.user && data.sessionId) {
              console.log('Setting auth state:', {
                user: data.user,
                sessionId: data.sessionId?.substring(0, 8) + '...',
                isAuthenticated: true,
              });
              
              set({
                user: data.user,
                sessionId: data.sessionId,
                isAuthenticated: true,
              });
              return true;
            }
          }

          // 로그인 실패
          const errorData = await response.json().catch(() => ({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }));
          console.error('Login failed:', errorData);
          throw new Error(errorData.error || '아이디 또는 비밀번호가 올바르지 않습니다.');

        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      logout: async () => {
        const { sessionId } = get();
        
        // 먼저 상태를 초기화
        set({
          user: null,
          sessionId: null,
          isAuthenticated: false,
        });
        
        // localStorage 정리
        localStorage.removeItem('sessionId');
        localStorage.removeItem('auth-storage');
        
        // 서버에 로그아웃 요청
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
        
        // 페이지 새로고침으로 확실히 초기화
        window.location.href = '/';
      },

      checkAuth: async () => {
        let { sessionId } = get();
        
        // localStorage에서 sessionId 확인 (페이지 새로고침 후 복원용)
        if (!sessionId) {
          const storedSessionId = localStorage.getItem('sessionId');
          console.log('Retrieved sessionId from auth-storage:', storedSessionId || 'missing');
          if (storedSessionId) {
            sessionId = storedSessionId;
            set({ sessionId: storedSessionId });
          }
        }
        
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
                sessionId: sessionId,
                isAuthenticated: true,
              });
              return true;
            }
          } else {
            console.log('Auth check failed:', response.status);
          }
          
          // 401 오류(인증 실패)만 로그아웃 처리, 다른 오류는 세션 유지
          if (response.status === 401) {
            console.log('Auth failed - clearing session');
            localStorage.removeItem('sessionId');
            set({
              user: null,
              sessionId: null,
              isAuthenticated: false,
            });
          } else {
            console.log('Auth check failed but keeping session for retry:', response.status);
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
      partialize: (state) => ({
        user: state.user,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
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
