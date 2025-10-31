import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Coins, Zap, TrendingUp, Clock, CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

type Transaction = {
  id: string;
  type: "purchase" | "deduction";
  amount: number;
  description: string;
  createdAt: string;
};

export default function Settings() {
  const { logoutMutation, user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedModel, setSelectedModel] = useState<string>("free");

  const { data: creditsData, isLoading: creditsLoading } = useQuery<{ credits: number; selectedAiModel: string }>({
    queryKey: ["/api/user/credits"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
  });

  // Sync selected model with backend
  useEffect(() => {
    if (creditsData?.selectedAiModel) {
      setSelectedModel(creditsData.selectedAiModel);
    }
  }, [creditsData]);

  // Check for payment success/cancel from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    
    if (payment === "success") {
      toast({
        title: "Credits purchased!",
        description: "Your credits have been added to your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
      // Remove query param
      window.history.replaceState({}, "", "/settings");
    } else if (payment === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "Your purchase was cancelled.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [toast]);

  const updateModelMutation = useMutation({
    mutationFn: async (model: string) => {
      return await apiRequest("PATCH", "/api/user/ai-model", { model });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });
      toast({
        title: "AI model updated",
        description: "Your AI model preference has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI model",
        variant: "destructive",
      });
    },
  });

  const buyCredits = useMutation({
    mutationFn: async (pkg: string) => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", { package: pkg });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    updateModelMutation.mutate(model);
  };

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send verification email");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification email.",
      });
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  const credits = creditsData?.credits || 0;
  const creditsInDollars = (credits / 1000).toFixed(2);
  const hasPremium = credits > 0;

  function ResendVerificationButton() {
    return (
      <Button
        onClick={() => resendVerificationMutation.mutate()}
        disabled={resendVerificationMutation.isPending}
        variant="outline"
        className="mt-2"
      >
        {resendVerificationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!resendVerificationMutation.isPending && <Mail className="mr-2 h-4 w-4" />}
        {resendVerificationMutation.isPending ? "Sending..." : "Resend Verification Email"}
      </Button>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your account and premium features</p>
      
      <div className="space-y-8">
        {/* Premium Features Section */}
        <div id="premium-features" className="space-y-4">
          <h2 className="text-xl font-semibold">Premium Features</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Credits & Premium
              </CardTitle>
              <CardDescription>Manage your credits for premium AI features</CardDescription>
            </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold" data-testid="text-credit-balance">
                  {creditsLoading ? "..." : `${credits.toLocaleString()} credits`}
                </p>
                <p className="text-sm text-muted-foreground">${creditsInDollars} USD equivalent</p>
              </div>
              <Coins className="h-12 w-12 text-muted-foreground" />
            </div>

            <div>
              <h3 className="font-semibold mb-3">Purchase Credits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => buyCredits.mutate("5")}
                  disabled={buyCredits.isPending}
                  data-testid="button-buy-credits-5"
                >
                  <span className="font-semibold">Starter</span>
                  <span className="text-sm text-muted-foreground">5,000 credits</span>
                  <span className="text-lg font-bold mt-1">$5.00</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start relative"
                  onClick={() => buyCredits.mutate("10")}
                  disabled={buyCredits.isPending}
                  data-testid="button-buy-credits-10"
                >
                  <span className="font-semibold">Popular</span>
                  <span className="text-sm text-muted-foreground">11,000 credits (+10% bonus)</span>
                  <span className="text-lg font-bold mt-1">$10.00</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => buyCredits.mutate("25")}
                  disabled={buyCredits.isPending}
                  data-testid="button-buy-credits-25"
                >
                  <span className="font-semibold">Pro</span>
                  <span className="text-sm text-muted-foreground">30,000 credits (+20% bonus)</span>
                  <span className="text-lg font-bold mt-1">$25.00</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => buyCredits.mutate("50")}
                  disabled={buyCredits.isPending}
                  data-testid="button-buy-credits-50"
                >
                  <span className="font-semibold">Best Value</span>
                  <span className="text-sm text-muted-foreground">65,000 credits (+30% bonus)</span>
                  <span className="text-lg font-bold mt-1">$50.00</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Model Selection
              </CardTitle>
              <CardDescription>Choose your AI speed and quality</CardDescription>
            </CardHeader>
            <CardContent>
            <RadioGroup value={selectedModel} onValueChange={handleModelChange}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 rounded-lg border hover-elevate cursor-pointer">
                  <RadioGroupItem value="free" id="free" data-testid="radio-model-free" />
                  <Label htmlFor="free" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Free (Slower)</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Cost: <span className="font-medium">Free</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quality: Good for most documents
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Speed: 30-60 seconds per chapter
                    </div>
                  </Label>
                </div>

                <div className={`flex items-start space-x-3 p-4 rounded-lg border ${!hasPremium ? 'opacity-50' : 'hover-elevate cursor-pointer'}`}>
                  <RadioGroupItem value="fast" id="fast" disabled={!hasPremium} data-testid="radio-model-fast" />
                  <Label htmlFor="fast" className={`flex-1 ${hasPremium ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className="font-semibold">Fast (Premium)</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Cost: <span className="font-medium">~20-40 credits per chapter</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quality: Better writing, faster responses
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Speed: 10-20 seconds per chapter
                    </div>
                    {!hasPremium && (
                      <div className="text-sm text-destructive mt-2">Requires credits</div>
                    )}
                  </Label>
                </div>

                <div className={`flex items-start space-x-3 p-4 rounded-lg border ${!hasPremium ? 'opacity-50' : 'hover-elevate cursor-pointer'}`}>
                  <RadioGroupItem value="ultra" id="ultra" disabled={!hasPremium} data-testid="radio-model-ultra" />
                  <Label htmlFor="ultra" className={`flex-1 ${hasPremium ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className="font-semibold">Ultra Fast (Premium)</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Cost: <span className="font-medium">~400-600 credits per chapter</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quality: Best quality, professional-grade
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Speed: 5-10 seconds per chapter
                    </div>
                    {!hasPremium && (
                      <div className="text-sm text-destructive mt-2">Requires credits</div>
                    )}
                  </Label>
                </div>
              </div>
            </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Billing Section */}
        <div id="billing" className="space-y-4">
          <h2 className="text-xl font-semibold">Billing</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Transaction Log
              </CardTitle>
              <CardDescription>View all credit purchases and usage</CardDescription>
            </CardHeader>
            <CardContent>
            {transactionsLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {tx.type === "purchase" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Account Section */}
        <div id="account" className="space-y-4">
          <h2 className="text-xl font-semibold">Account</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verification</label>
              <div className="mt-2 flex items-center gap-3">
                {user?.emailVerified === "true" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">Not verified</span>
                    <ResendVerificationButton />
                  </>
                )}
              </div>
            </div>
            <div className="pt-4">
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                data-testid="button-logout-settings"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Verification Component */}
        {user && user.emailVerified !== "true" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Email Verification</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Verify Your Email
                </CardTitle>
                <CardDescription>
                  Please verify your email address to access all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResendVerificationButton />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preferences Section */}
        <div id="preferences" className="space-y-4">
          <h2 className="text-xl font-semibold">Preferences</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
