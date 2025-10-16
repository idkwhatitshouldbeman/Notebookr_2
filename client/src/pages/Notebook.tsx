import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Sparkles, FileText, User, Bot, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import type { Notebook as NotebookType, Section } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Notebook() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Ready to edit your notebook. Give me instructions and I'll update the sections directly."
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [aiPhase, setAiPhase] = useState<"plan" | "execute" | "review" | null>(null);
  const [aiConfidence, setAiConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: notebook } = useQuery<NotebookType>({
    queryKey: ["/api/notebooks", id],
    queryFn: async () => {
      const response = await fetch(`/api/notebooks/${id}`);
      return response.json();
    },
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<Section[]>({
    queryKey: ["/api/notebooks", id, "sections"],
    queryFn: async () => {
      const response = await fetch(`/api/notebooks/${id}/sections`);
      return response.json();
    },
    enabled: !!id && id !== "undefined",
  });

  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title);
    }
  }, [notebook]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const generateAI = useMutation({
    mutationFn: async (data: { instruction: string; notebookId: string; sections: Array<{ id: string; title: string; content: string }> }) => {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });

  const createSection = useMutation({
    mutationFn: async (data: { notebookId: string; title: string; content: string; orderIndex: string }) => {
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const handleSend = async () => {
    if (!input.trim() || !Array.isArray(sections)) return;

    console.log("🚀 User instruction:", input);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    const instruction = input;
    setInput("");

    const currentSections = sections.map(s => ({ 
      id: s.id, 
      title: s.title, 
      content: s.content || '' 
    }));
    console.log("📝 Current sections:", currentSections);
    
    try {
      console.log("🤖 AI is editing notebook...");
      setAiPhase("plan"); // Initial phase
      const result = await generateAI.mutateAsync({ instruction, notebookId: id!, sections: currentSections });
      console.log("✅ AI Response:", result);
      
      // Update phase and confidence
      setAiPhase(result.phase || null);
      setAiConfidence(result.confidence || null);
      
      // Clear phase indicator after 3 seconds
      setTimeout(() => {
        setAiPhase(null);
        setAiConfidence(null);
      }, 3000);
      
      // Add AI message to chat with phase info
      const phaseEmoji = result.phase === "plan" ? "📋" : result.phase === "execute" ? "⚡" : "🔍";
      const confidenceText = result.confidence ? ` (${result.confidence} confidence)` : "";
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `${phaseEmoji} ${result.message || "I've updated the notebook sections."}${confidenceText}`,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Apply AI actions automatically (Cursor-style)
      if (result.actions && Array.isArray(result.actions)) {
        let createCount = 0;
        for (const action of result.actions) {
          // Validate action has required fields
          if (!action.type || !action.sectionId || action.content === undefined) {
            console.warn(`⚠️ Skipping invalid action:`, action);
            continue;
          }

          console.log(`🔧 Applying action: ${action.type} on ${action.sectionId}`);
          
          if (action.type === "update") {
            // Find the section and update it
            const targetSection = sections.find(s => s.id === action.sectionId);
            if (targetSection) {
              setEditingSections(prev => new Set(prev).add(targetSection.id));
              try {
                await updateSection.mutateAsync({ 
                  sectionId: action.sectionId, 
                  content: action.content 
                });
                console.log(`✅ Updated section: ${targetSection.title}`);
              } catch (error) {
                console.error(`❌ Failed to update section ${targetSection.title}:`, error);
              } finally {
                setEditingSections(prev => {
                  const next = new Set(prev);
                  next.delete(targetSection.id);
                  return next;
                });
              }
            } else {
              console.warn(`⚠️ Section ${action.sectionId} not found for update`);
            }
          } else if (action.type === "create") {
            // Create new section with unique orderIndex
            try {
              await createSection.mutateAsync({
                notebookId: id!,
                title: action.sectionId,
                content: action.content,
                orderIndex: String(sections.length + createCount)
              });
              createCount++;
              console.log(`✅ Created new section: ${action.sectionId}`);
            } catch (error) {
              console.error(`❌ Failed to create section ${action.sectionId}:`, error);
            }
          }
        }
        
        // Refresh sections after all updates
        queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id, "sections"] });
      }
    } catch (error) {
      console.error("❌ AI error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!notebook || !id || id === "undefined") {
    return <div className="p-12">Loading...</div>;
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
        <div className="border-b border-border p-4 flex items-center gap-3">
          <span className="text-3xl">{notebook.emoji}</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent"
            data-testid="input-notebook-title"
          />
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {aiPhase && (
              <div className="mb-4 p-3 rounded-lg bg-accent/50 border border-accent flex items-center gap-3">
                {aiPhase === "plan" && <><Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Planning document structure...</span></>}
                {aiPhase === "execute" && <><Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Executing tasks...</span></>}
                {aiPhase === "review" && <><Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Reviewing work...</span></>}
                {aiConfidence && (
                  <Badge variant={aiConfidence === "high" ? "default" : aiConfidence === "medium" ? "secondary" : "outline"} className="ml-auto">
                    {aiConfidence} confidence
                  </Badge>
                )}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <Card className={`p-4 max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </Card>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4 pb-6">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Instruction for the AI... (e.g., 'Add detailed objectives about measuring thermal conductivity')"
              className="resize-none"
              rows={3}
              data-testid="textarea-chat-input"
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || generateAI.isPending}
              size="icon"
              className="h-full"
              data-testid="button-send"
            >
              {generateAI.isPending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-80 p-4 bg-card overflow-auto">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Chapters</h3>
        </div>
        <div className="space-y-3">
          {Array.isArray(sections) && sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section)}
              className={`w-full text-left p-3 rounded-md hover-elevate transition-all relative ${
                selectedSection?.id === section.id ? "bg-accent" : ""
              } ${
                editingSections.has(section.id) ? "ring-2 ring-primary animate-pulse" : ""
              }`}
              data-testid={`chapter-link-${section.title.toLowerCase()}`}
            >
              <div className="font-medium text-foreground text-sm mb-1 flex items-center gap-2">
                {index + 1}. {section.title}
                {editingSections.has(section.id) && (
                  <Sparkles className="h-3 w-3 text-primary animate-spin" />
                )}
              </div>
              {section.content && (
                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {section.content}
                </div>
              )}
            </button>
          ))}
        </div>

        <Dialog open={!!selectedSection} onOpenChange={(open) => !open && setSelectedSection(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedSection?.title}</DialogTitle>
              <DialogDescription>Chapter content</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {selectedSection?.content || "No content yet. Chat with the AI to add content to this chapter."}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
