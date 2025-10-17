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
import { Send, Sparkles, FileText, User, Bot, Loader2, Maximize2, Minimize2 } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [recentlyUpdatedSections, setRecentlyUpdatedSections] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    mutationFn: async (data: { 
      instruction: string; 
      notebookId: string; 
      sections: Array<{ id: string; title: string; content: string }>;
      aiMemory?: any;
    }) => {
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
      
      // Keep calling AI until complete
      let aiMemory: any = undefined;
      let isComplete = false;
      let iterationCount = 0;
      const maxIterations = 50; // Safety limit
      
      while (!isComplete && iterationCount < maxIterations) {
        iterationCount++;
        
        const result = await generateAI.mutateAsync({ 
          instruction: aiMemory ? "" : instruction, // Only send instruction on first call
          notebookId: id!, 
          sections: currentSections,
          aiMemory
        });
        console.log(`✅ AI Response (iteration ${iterationCount}):`, result);
        
        // Update phase and plan
        setAiPhase(result.phase || null);
        if (result.plan) {
          setCurrentPlan(result.plan);
        }
        
        // Auto-generate title if it's still "Untitled Notebook" and AI suggested a title
        if (notebook?.title === "Untitled Notebook" && result.suggestedTitle) {
          setTitle(result.suggestedTitle);
          updateTitle.mutate(result.suggestedTitle);
        }

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
                setRecentlyUpdatedSections(prev => new Set(prev).add(targetSection.id));
                try {
                  await updateSection.mutateAsync({ 
                    sectionId: action.sectionId, 
                    content: action.content 
                  });
                  console.log(`✅ Updated section: ${targetSection.title}`);
                  
                  // Clear the highlight after 2 seconds
                  setTimeout(() => {
                    setRecentlyUpdatedSections(prev => {
                      const next = new Set(prev);
                      next.delete(targetSection.id);
                      return next;
                    });
                  }, 2000);
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
                const newSection = await createSection.mutateAsync({
                  notebookId: id!,
                  title: action.sectionId,
                  content: action.content,
                  orderIndex: String(sections.length + createCount)
                });
                createCount++;
                console.log(`✅ Created new section: ${action.sectionId}`);
                
                // Highlight new section
                if (newSection?.id) {
                  setRecentlyUpdatedSections(prev => new Set(prev).add(newSection.id));
                  setTimeout(() => {
                    setRecentlyUpdatedSections(prev => {
                      const next = new Set(prev);
                      next.delete(newSection.id);
                      return next;
                    });
                  }, 2000);
                }
              } catch (error) {
                console.error(`❌ Failed to create section ${action.sectionId}:`, error);
              }
            }
          }
          
          // Refresh sections after all updates
          queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id, "sections"] });
        }
        
        // Check if work is complete
        isComplete = result.isComplete || false;
        aiMemory = result.aiMemory;
        
        // If not complete, continue looping
        if (!isComplete && result.shouldContinue) {
          console.log("🔄 AI workflow continuing...");
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between calls
        } else if (!result.shouldContinue) {
          break;
        }
      }
      
      // Clear phase indicator
      setAiPhase(null);
      
      // Add final AI message to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isComplete ? "Document complete" : (iterationCount >= maxIterations ? "Document generation complete (reached iteration limit)" : "I've updated the notebook sections."),
      };
      setMessages(prev => [...prev, aiMessage]);
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
      {!isExpanded ? (
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border p-4 flex items-center gap-3">
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
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border p-4 flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent"
              data-testid="input-notebook-title-expanded"
            />
          </div>
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {Array.isArray(sections) && sections.map((section, index) => (
                <div
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  className="scroll-mt-4"
                >
                  <h2 className="text-2xl font-bold mb-4">{index + 1}. {section.title}</h2>
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {section.content || "No content yet."}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="w-80 p-4 bg-card overflow-auto">
        {currentPlan && currentPlan.tasks && currentPlan.tasks.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Task List
            </h3>
            <div className="space-y-2">
              {currentPlan.tasks.map((task: any, index: number) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded-md ${
                    task.done 
                      ? "bg-primary/10 text-primary line-through" 
                      : "bg-accent/50 text-foreground"
                  }`}
                  data-testid={`task-item-${index}`}
                >
                  <div className="font-medium">{task.action}: {task.section}</div>
                  {task.description && (
                    <div className="text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Chapters</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-expand-chapters"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-3">
          {Array.isArray(sections) && sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => isExpanded ? scrollToSection(section.id) : setSelectedSection(section)}
              className={`w-full text-left p-3 rounded-md hover-elevate transition-all relative ${
                selectedSection?.id === section.id ? "bg-accent" : ""
              } ${
                editingSections.has(section.id) ? "ring-2 ring-primary animate-pulse" : ""
              } ${
                recentlyUpdatedSections.has(section.id) ? "bg-primary/20 ring-1 ring-primary/50" : ""
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
