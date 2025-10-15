import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import type { Section } from "@shared/schema";

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  activeSectionId: string | null;
  onAccept: (content: string) => void;
}

export function AIPanel({ isOpen, onClose, sections, activeSectionId, onAccept }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; context: Array<{ title: string; content: string }> }) => {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
    },
  });

  const handleGenerate = () => {
    // Build context from sections that have content
    const context = sections
      .filter(s => s.content)
      .map(s => ({ title: s.title, content: s.content }));
    
    generateMutation.mutate({ prompt, context });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleAccept = () => {
    onAccept(generatedContent);
    setGeneratedContent("");
    setPrompt("");
  };

  const handleDiscard = () => {
    setGeneratedContent("");
  };

  if (!isOpen) return null;

  const sectionsWithContent = sections.filter(s => s.content);
  const activeSection = sections.find(s => s.id === activeSectionId);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-card-border shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-ai-panel">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {activeSection && (
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">
              Generating for
            </label>
            <Badge variant="secondary">{activeSection.title}</Badge>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">
            Context Awareness
          </label>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <Badge 
                key={section.id}
                variant={section.content ? "secondary" : "outline"}
                className={section.content ? "gap-1" : ""}
              >
                {section.content && <Check className="h-3 w-3" />}
                {section.title}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">
            What would you like to generate?
          </label>
          <Textarea
            placeholder="E.g., 'Write an introduction based on the experimental setup...'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-ai-prompt"
          />
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleGenerate}
          disabled={generateMutation.isPending || !prompt}
          data-testid="button-generate"
        >
          <Sparkles className="h-4 w-4" />
          {generateMutation.isPending ? "Generating..." : "Generate"}
        </Button>

        {generatedContent && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Generated Content</h4>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending}
                data-testid="button-regenerate"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {generateMutation.isPending ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                  {generatedContent}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-2" onClick={handleAccept} data-testid="button-accept">
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleDiscard} data-testid="button-discard">
                    <X className="h-4 w-4" />
                    Discard
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
