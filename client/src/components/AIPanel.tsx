import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, RotateCcw } from "lucide-react";

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedContent("Based on the experimental setup, the primary objective is to analyze the thermal efficiency of the heat exchanger under varying flow rates. This investigation aims to establish a correlation between Reynolds number and heat transfer coefficient...");
      setIsGenerating(false);
    }, 2000);
  };

  if (!isOpen) return null;

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
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">
            Context Awareness
          </label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Objectives
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Methods
            </Badge>
            <Badge variant="outline">Observations</Badge>
            <Badge variant="outline">Conclusions</Badge>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">
            What would you like to generate?
          </label>
          <Textarea
            placeholder="E.g., 'Write an introduction for the observations section based on the experimental setup...'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-ai-prompt"
          />
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          data-testid="button-generate"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate"}
        </Button>

        {generatedContent && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Generated Content</h4>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-regenerate">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {isGenerating ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  {generatedContent}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-2" data-testid="button-accept">
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2" data-testid="button-discard">
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
