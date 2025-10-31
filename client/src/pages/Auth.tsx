// Based on blueprint:javascript_auth_all_persistance
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, BookOpen, Zap, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, gmailSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  email: gmailSchema,
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.pick({ 
  email: true, 
  password: true
}).extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Auth() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      email: "", 
      password: "",
      confirmPassword: ""
    },
  });

  // Redirect if already logged in (after all hooks)
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginForm) => {
    console.log("[AUTH] Login form submitted", {
      email: data.email,
      hasPassword: !!data.password,
      passwordLength: data.password?.length || 0,
      timestamp: new Date().toISOString(),
    });
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    console.log("[AUTH] Register form submitted", {
      email: data.email,
      hasPassword: !!data.password,
      passwordLength: data.password?.length || 0,
      passwordsMatch: data.password === data.confirmPassword,
      timestamp: new Date().toISOString(),
    });
    // Only send email and password to the API, not confirmPassword
    registerMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Auth forms */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Welcome to Notebookr</h1>
            <p className="text-muted-foreground">AI-powered engineering notebooks</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign in to your account</CardTitle>
                  <CardDescription>Enter your credentials to access your notebooks</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    {loginMutation.error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Sign in failed</AlertTitle>
                        <AlertDescription>
                          {loginMutation.error.message.includes("401") || loginMutation.error.message.toLowerCase().includes("invalid") || loginMutation.error.message.toLowerCase().includes("unauthorized")
                            ? "Invalid email or password. Please try again."
                            : loginMutation.error.message.includes("404")
                            ? "Unable to connect to the server. Please check your connection."
                            : loginMutation.error.message.includes("500") || loginMutation.error.message.includes("502") || loginMutation.error.message.includes("503")
                            ? "Server error. Please try again in a moment."
                            : loginMutation.error.message.includes("network") || loginMutation.error.message.includes("fetch")
                            ? "Network error. Please check your internet connection."
                            : "Unable to sign in. Please check your credentials and try again."}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Gmail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        data-testid="input-login-email"
                        {...loginForm.register("email")}
                        placeholder="yourname@gmail.com"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        data-testid="input-login-password"
                        {...loginForm.register("password")}
                        placeholder="Enter password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Get started with your free account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    {registerMutation.error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Registration failed</AlertTitle>
                        <AlertDescription>
                          {registerMutation.error.message.toLowerCase().includes("email") && (registerMutation.error.message.toLowerCase().includes("taken") || registerMutation.error.message.toLowerCase().includes("exists"))
                            ? "This email is already registered. Please use a different Gmail address."
                            : registerMutation.error.message.toLowerCase().includes("password") && registerMutation.error.message.toLowerCase().includes("weak")
                            ? "Password is too weak. Please choose a stronger password."
                            : registerMutation.error.message.includes("404")
                            ? "Unable to connect to the server. Please check your connection."
                            : registerMutation.error.message.includes("500") || registerMutation.error.message.includes("502") || registerMutation.error.message.includes("503")
                            ? "Server error. Please try again in a moment."
                            : registerMutation.error.message.includes("network") || registerMutation.error.message.includes("fetch")
                            ? "Network error. Please check your internet connection."
                            : "Unable to create your account. Please try again."}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Gmail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        data-testid="input-register-email"
                        {...registerForm.register("email")}
                        placeholder="yourname@gmail.com"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        data-testid="input-register-password"
                        {...registerForm.register("password")}
                        placeholder="Create a password"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirm Password</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        data-testid="input-register-confirm-password"
                        {...registerForm.register("confirmPassword")}
                        placeholder="Confirm your password"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20 p-12">
        <div className="max-w-lg space-y-8 text-center">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold">
              Write smarter with AI
            </h2>
            <p className="text-xl text-muted-foreground">
              Have a conversation with AI and watch it write professional engineering documentation for you
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-start gap-4 text-left">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Writing</h3>
                <p className="text-sm text-muted-foreground">
                  Simply chat with AI and it generates structured technical content
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Auto-Organized</h3>
                <p className="text-sm text-muted-foreground">
                  Content automatically flows into the right sections
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Create lab reports, design docs, and project logs in minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
