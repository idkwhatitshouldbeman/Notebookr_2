import { Button } from "@/components/ui/button";
import { Sparkles, Zap, MessagesSquare, BookOpen } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-16 py-12">
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Engineering Notebooks
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-foreground tracking-tight">
            Write smarter,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              not harder
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Have a conversation with AI and watch it write professional engineering documentation for you
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="gap-2 text-lg px-8 py-6 h-auto" asChild data-testid="button-get-started">
              <a href="/api/login">
                <Sparkles className="h-5 w-5" />
                Get Started Free
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 h-auto" asChild data-testid="button-login">
              <a href="/api/login">
                Sign In
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="group p-8 rounded-2xl bg-card border border-border hover-elevate transition-all">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessagesSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Conversational AI</h3>
            <p className="text-muted-foreground leading-relaxed">
              Simply chat with AI about your work and it generates structured technical content
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-card border border-border hover-elevate transition-all">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Auto-Organized</h3>
            <p className="text-muted-foreground leading-relaxed">
              Content automatically flows into the right sections and chapters
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-card border border-border hover-elevate transition-all">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Lightning Fast</h3>
            <p className="text-muted-foreground leading-relaxed">
              Create lab reports, design docs, and project logs in minutes
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
          Free forever • No credit card required
        </div>
      </div>
    </div>
  );
}
