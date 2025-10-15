import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Beaker } from "lucide-react";
import heroImage from "@assets/stock_images/technical_blueprint__e470fe50.jpg";

export function HeroSection() {
  return (
    <div className="relative min-h-[500px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI-Powered Engineering Documentation</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-semibold mb-6 text-foreground">
          Create Professional Engineering Notebooks with AI
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Generate detailed lab reports, design documentation, and project logs with adaptive AI writing. 
          Build comprehensive notebooks section-by-section while maintaining perfect consistency.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="gap-2"
            data-testid="button-get-started"
          >
            <FileText className="h-5 w-5" />
            Get Started Free
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="gap-2 backdrop-blur-sm bg-background/50"
            data-testid="button-view-templates"
          >
            <Beaker className="h-5 w-5" />
            View Templates
          </Button>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-lg p-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Adaptive AI Writing</h3>
            <p className="text-sm text-muted-foreground">AI that learns from your content and maintains consistency throughout long documents</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-lg p-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Professional Templates</h3>
            <p className="text-sm text-muted-foreground">Pre-built formats for lab reports, design docs, and technical documentation</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-lg p-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Beaker className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Export Anywhere</h3>
            <p className="text-sm text-muted-foreground">Download your notebooks as PDF or Markdown for easy sharing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
