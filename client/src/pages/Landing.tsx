import { Button } from "@/components/ui/button";
import { FileText, Sparkles, BookOpen } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">EngiNote</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-foreground">
              Your AI-Powered Engineering Notebook
            </h1>
            <p className="text-xl text-muted-foreground">
              Chat with AI to write professional engineering notebooks. 
              Let AI handle the writing while you focus on your work.
            </p>
          </div>

          <Button size="lg" className="gap-2" asChild data-testid="button-get-started">
            <a href="/api/login">
              <Sparkles className="h-5 w-5" />
              Get Started Free
            </a>
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-lg border border-border">
              <Sparkles className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">AI-Powered Writing</h3>
              <p className="text-sm text-muted-foreground">
                Have a conversation with AI and watch it write your notebook content
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border">
              <BookOpen className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">Organized Chapters</h3>
              <p className="text-sm text-muted-foreground">
                Navigate through your notebook with organized sections and chapters
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border">
              <FileText className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">Professional Output</h3>
              <p className="text-sm text-muted-foreground">
                Generate lab reports, design docs, and project logs effortlessly
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
