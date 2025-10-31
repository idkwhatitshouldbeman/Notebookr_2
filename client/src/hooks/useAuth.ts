// Based on blueprint:javascript_auth_all_persistance
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient, setToken, removeToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = Pick<InsertUser, "email" | "password">;

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("[LOGIN] Initiating login request", {
        email: credentials.email,
        hasPassword: !!credentials.password,
        passwordLength: credentials.password?.length || 0,
        timestamp: new Date().toISOString(),
      });

      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        console.log("[LOGIN] API response received", {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
        });

        const data = await res.json();
        console.log("[LOGIN] Response data parsed", {
          hasUser: !!data.user,
          hasToken: !!data.token,
          userId: data.user?.id,
          email: data.user?.email,
        });

        // Save token from response
        if (data.token) {
          console.log("[LOGIN] Saving token to storage");
          setToken(data.token);
        } else {
          console.warn("[LOGIN] No token received in response");
        }

        console.log("[LOGIN] Login successful", {
          userId: data.user?.id,
          email: data.user?.email,
        });

        return data.user || data;
      } catch (error: any) {
        console.error("[LOGIN] Request failed:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          error: error,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log("[LOGIN] Mutation successful, updating cache", {
        userId: user?.id,
        email: user?.email,
      });
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("[LOGIN] Mutation error:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
        timestamp: new Date().toISOString(),
      });

      // Parse error message to make it user-friendly
      let userFriendlyMessage = "Unable to sign in. Please check your credentials and try again.";
      
      if (error.message) {
        if (error.message.includes("401") || error.message.toLowerCase().includes("invalid") || error.message.toLowerCase().includes("unauthorized")) {
          userFriendlyMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("404")) {
          userFriendlyMessage = "Unable to connect to the server. Please check your connection.";
        } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
          userFriendlyMessage = "Server error. Please try again in a moment.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          userFriendlyMessage = "Network error. Please check your internet connection.";
        }
      }

      console.log("[LOGIN] Showing error toast:", userFriendlyMessage);
      
      toast({
        title: "Sign in failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("[REGISTER] Initiating registration request", {
        email: credentials.email,
        hasPassword: !!credentials.password,
        passwordLength: credentials.password?.length || 0,
        timestamp: new Date().toISOString(),
      });

      try {
        const res = await apiRequest("POST", "/api/register", credentials);
        console.log("[REGISTER] API response received", {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
        });

        const data = await res.json();
        console.log("[REGISTER] Response data parsed", {
          hasUser: !!data.user,
          hasToken: !!data.token,
          userId: data.user?.id,
          email: data.user?.email,
        });

        // Save token from response
        if (data.token) {
          console.log("[REGISTER] Saving token to storage");
          setToken(data.token);
        } else {
          console.warn("[REGISTER] No token received in response");
        }

        console.log("[REGISTER] Registration successful", {
          userId: data.user?.id,
          email: data.user?.email,
        });

        return data.user || data;
      } catch (error: any) {
        console.error("[REGISTER] Request failed:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          error: error,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log("[REGISTER] Mutation successful, updating cache", {
        userId: user?.id,
        email: user?.email,
      });
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("[REGISTER] Mutation error:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
        timestamp: new Date().toISOString(),
      });

      // Parse error message to make it user-friendly
      let userFriendlyMessage = "Unable to create your account. Please try again.";
      
      if (error.message) {
        if (error.message.toLowerCase().includes("email") && (error.message.toLowerCase().includes("taken") || error.message.toLowerCase().includes("exists"))) {
          userFriendlyMessage = "This email is already registered. Please use a different Gmail address.";
        } else if (error.message.toLowerCase().includes("password") && error.message.toLowerCase().includes("weak")) {
          userFriendlyMessage = "Password is too weak. Please choose a stronger password.";
        } else if (error.message.includes("404")) {
          userFriendlyMessage = "Unable to connect to the server. Please check your connection.";
        } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
          userFriendlyMessage = "Server error. Please try again in a moment.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          userFriendlyMessage = "Network error. Please check your internet connection.";
        }
      }

      console.log("[REGISTER] Showing error toast:", userFriendlyMessage);
      
      toast({
        title: "Registration failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      removeToken();
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user: user === null ? null : user,
    isLoading,
    isAuthenticated: !!user && user !== null,
    error,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
