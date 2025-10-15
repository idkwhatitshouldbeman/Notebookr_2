import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import heroImage from "@assets/stock_images/technical_blueprint__e470fe50.jpg";

export function HeroSection() {
  return (
    <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-semibold mb-6 text-foreground">
          Engineering Notebooks,
          <br />
          <span className="text-primary">Powered by AI</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
          Create beautiful technical documentation with AI assistance
        </p>
        
        <Button 
          size="lg" 
          className="gap-2 h-14 px-8 text-base rounded-full"
          data-testid="button-get-started"
        >
          <FileText className="h-5 w-5" />
          Start Writing
        </Button>
      </div>
    </div>
  );
}
