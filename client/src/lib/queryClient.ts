import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get session ID from auth store
  let sessionId = null;
  try {
    const authStore = localStorage.getItem('auth-store');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      sessionId = parsed?.state?.sessionId || null;
    }
  } catch (e) {
    console.warn('Failed to parse auth store:', e);
  }
  
  const headers: Record<string, string> = {};
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (sessionId) {
    headers["Authorization"] = `Bearer ${sessionId}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get session ID from auth store
    let sessionId = null;
    try {
      const authStore = localStorage.getItem('auth-store');
      if (authStore) {
        const parsed = JSON.parse(authStore);
        sessionId = parsed?.state?.sessionId || null;
      }
    } catch (e) {
      console.warn('Failed to parse auth store:', e);
    }
    
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers["Authorization"] = `Bearer ${sessionId}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
