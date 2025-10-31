import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, setToken, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", {
        token: verificationToken,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      
      // Save token if provided
      if (data.token) {
        setToken(data.token);
      }
      
      return data;
    },
    onSuccess: (data) => {
      setVerificationStatus("success");
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully.",
      });
      
      // Refresh user data
      queryClient.setQueryData(["/api/user"], data.user);
      
      if (data.user) {
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    },
    onError: (error: Error) => {
      setVerificationStatus("error");
      setErrorMessage(error.message || "Failed to verify email");
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired verification token",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setVerificationStatus("error");
      setErrorMessage("No verification token provided");
    }
  }, [token]);

  if (!token && verificationStatus !== "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>Please wait while we verify your email...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {verificationStatus === "loading" && "Verifying your email address..."}
            {verificationStatus === "success" && "Email verified successfully!"}
            {verificationStatus === "error" && "Verification failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold">Your email has been verified!</p>
                <p className="text-sm text-muted-foreground">
                  You can now access all features of Notebookr.
                </p>
              </div>
              <Button onClick={() => setLocation("/")} className="w-full">
                Go to Home
              </Button>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold">Verification failed</p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || "The verification link is invalid or has expired."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Please request a new verification email from your account settings.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => setLocation("/auth")} className="flex-1">
                  Sign In
                </Button>
                <Button onClick={() => setLocation("/settings")} className="flex-1">
                  Go to Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

