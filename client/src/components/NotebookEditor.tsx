import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Save, Download, Sparkles } from "lucide-react";

interface NotebookEditorProps {
  onAIGenerate?: () => void;
}

export function NotebookEditor({ onAIGenerate }: NotebookEditorProps) {
  const [title, setTitle] = useState("Untitled Notebook");
  const [sections, setSections] = useState([
    { id: 1, title: "Objectives", content: "" },
    { id: 2, title: "Methods", content: "" },
    { id: 3, title: "Observations", content: "" },
    { id: 4, title: "Conclusions", content: "" },
  ]);

  const updateSection = (id: number, content: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, content } : s));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4 flex items-center justify-between gap-4 flex-wrap">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 max-w-md"
          data-testid="input-notebook-title"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Auto-saved</span>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-save">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-export">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <Card key={section.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {index + 1}. {section.title}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={onAIGenerate}
                  data-testid={`button-ai-generate-${section.title.toLowerCase()}`}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                </Button>
              </div>
              <Textarea
                placeholder={`Write your ${section.title.toLowerCase()} here or use AI to generate...`}
                value={section.content}
                onChange={(e) => updateSection(section.id, e.target.value)}
                className="min-h-[200px] resize-none text-base leading-relaxed"
                data-testid={`textarea-${section.title.toLowerCase()}`}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                {section.content.length} characters
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
