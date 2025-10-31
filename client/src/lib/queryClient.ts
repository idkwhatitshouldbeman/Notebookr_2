import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get JWT token from localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Save JWT token to localStorage
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

// Remove JWT token from localStorage
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

async function throwIfResNotOk(res: Response, url: string, method: string) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    
    console.error("[API_REQUEST] Request failed:", {
      url,
      method,
      status: res.status,
      statusText: res.statusText,
      responseText: text,
      headers: Object.fromEntries(res.headers.entries()),
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  
  console.log("[API_REQUEST] Making request:", {
    method,
    url: fullUrl,
    hasData: !!data,
    dataKeys: data && typeof data === "object" ? Object.keys(data) : undefined,
    timestamp: new Date().toISOString(),
  });

  const token = getToken();
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[API_REQUEST] Token attached:", {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + "...",
    });
  } else {
    console.log("[API_REQUEST] No token available");
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log("[API_REQUEST] Response received:", {
      url: fullUrl,
      method,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
    });

    await throwIfResNotOk(res, fullUrl, method);
    return res;
  } catch (error: any) {
    console.error("[API_REQUEST] Fetch error:", {
      url: fullUrl,
      method,
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey.join("/") as string;
    // Ensure URL starts with / if it's not a full URL
    if (!url.startsWith("http") && !url.startsWith("/")) {
      url = `/${url}`;
    }
    const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    
    console.log("[QUERY_FN] Making query request:", {
      queryKey: queryKey.join("/"),
      url: fullUrl,
      timestamp: new Date().toISOString(),
    });

    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("[QUERY_FN] Token attached:", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + "...",
      });
    } else {
      console.log("[QUERY_FN] No token available");
    }

    try {
      const res = await fetch(fullUrl, {
        headers,
      });

      console.log("[QUERY_FN] Response received:", {
        url: fullUrl,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("[QUERY_FN] 401 Unauthorized - returning null");
        return null;
      }

      await throwIfResNotOk(res, fullUrl, "GET");
      const data = await res.json();
      console.log("[QUERY_FN] Response data parsed:", {
        url: fullUrl,
        hasData: !!data,
        dataKeys: data && typeof data === "object" ? Object.keys(data) : undefined,
      });
      return data;
    } catch (error: any) {
      console.error("[QUERY_FN] Query error:", {
        url: fullUrl,
        error: error?.message,
        stack: error?.stack,
        name: error?.name,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
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
