import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Sparkles, Plus, FileText } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { Notebook as NotebookType, Section } from "@shared/schema";
import { AIPanel } from "@/components/AIPanel";

export default function Notebook() {
  const { id } = useParams<{ id: string }>();
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const { data: notebook } = useQuery<NotebookType>({
    queryKey: ["/api/notebooks", id],
    queryFn: async () => {
      const response = await fetch(`/api/notebooks/${id}`);
      return response.json();
    },
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/notebooks", id, "sections"],
    queryFn: async () => {
      const response = await fetch(`/api/notebooks/${id}/sections`);
      return response.json();
    },
  });

  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title);
    }
  }, [notebook]);

  useEffect(() => {
    if (sections.length > 0) {
      const contents: Record<string, string> = {};
      sections.forEach(section => {
        contents[section.id] = section.content;
      });
      setSectionContents(contents);
    }
  }, [sections]);

  const updateTitle = useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ sectionId, content }: { sectionId: string; content: string }) => {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id, "sections"] });
    },
  });

  const handleTitleBlur = () => {
    if (title !== notebook?.title) {
      updateTitle.mutate(title);
    }
  };

  const handleSectionChange = (sectionId: string, content: string) => {
    setSectionContents(prev => ({ ...prev, [sectionId]: content }));
    
    if (saveTimeouts.current[sectionId]) {
      clearTimeout(saveTimeouts.current[sectionId]);
    }
    
    saveTimeouts.current[sectionId] = setTimeout(() => {
      updateSection.mutate({ sectionId, content });
    }, 500);
  };

  const handleAIGenerate = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setIsAIPanelOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!notebook) {
    return <div className="p-12">Loading...</div>;
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-3xl">{notebook.emoji}</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 flex-1 max-w-md bg-transparent"
              data-testid="input-notebook-title"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-saved</span>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-save">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {sections.map((section, index) => (
                <Card key={section.id} id={`section-${section.id}`} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {index + 1}. {section.title}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleAIGenerate(section.id)}
                      data-testid={`button-ai-generate-${section.title.toLowerCase()}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder={`Write your ${section.title.toLowerCase()} here or use AI to generate...`}
                    value={sectionContents[section.id] || ""}
                    onChange={(e) => handleSectionChange(section.id, e.target.value)}
                    className="min-h-[200px] resize-none text-base leading-relaxed"
                    data-testid={`textarea-${section.title.toLowerCase()}`}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {(sectionContents[section.id] || "").length} characters
                  </div>
                </Card>
              ))}
              
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                data-testid="button-add-section"
              >
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            </div>
          </div>

          <div className="w-64 border-l border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Chapters</h3>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-1">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover-elevate transition-all text-sm"
                    data-testid={`chapter-link-${section.title.toLowerCase()}`}
                  >
                    <div className="font-medium text-foreground">
                      {index + 1}. {section.title}
                    </div>
                    {sectionContents[section.id] && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {sectionContents[section.id].substring(0, 50)}...
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <AIPanel 
        isOpen={isAIPanelOpen} 
        onClose={() => setIsAIPanelOpen(false)}
        sections={sections}
        activeSectionId={activeSectionId}
        onAccept={(content) => {
          if (activeSectionId) {
            handleSectionChange(activeSectionId, content);
            setIsAIPanelOpen(false);
          }
        }}
      />
    </div>
  );
}
