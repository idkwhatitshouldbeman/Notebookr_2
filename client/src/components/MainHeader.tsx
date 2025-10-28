import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function MainHeader() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: creditsData } = useQuery<{ credits: number; selectedAiModel: string }>({
    queryKey: ["/api/user/credits"],
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

  const credits = creditsData?.credits || 0;
  const hasPremium = credits > 0;

  const handleUpgradeClick = () => {
    if (hasPremium) {
      // Already have credits, redirect to settings to buy more
      setLocation("/settings");
    } else {
      // No credits, go to settings to see purchase options
      setLocation("/settings");
    }
  };

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-end h-14 px-6">
        <Button
          variant={hasPremium ? "outline" : "default"}
          size="sm"
          onClick={handleUpgradeClick}
          data-testid="button-header-upgrade"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {hasPremium ? "Buy More Credits" : "Upgrade"}
        </Button>
      </div>
    </div>
  );
}
