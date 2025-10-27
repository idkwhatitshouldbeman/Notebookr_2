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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, Sparkles, FileText, User, Bot, Loader2, Maximize2, Minimize2, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import type { Notebook as NotebookType, Section } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sectionTitle?: string;
  sectionContent?: string; // Actual section content for expandable messages
  isExpandable?: boolean;
  expanded?: boolean;
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
  const [persistedAiMemory, setPersistedAiMemory] = useState<any>(null);
  const [recentlyUpdatedSections, setRecentlyUpdatedSections] = useState<Set<string>>(new Set());
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isContextOpen, setIsContextOpen] = useState("context");
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

  const { data: loadedMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/notebooks", id, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/notebooks/${id}/messages`);
      return response.json();
    },
    enabled: !!id && id !== "undefined",
  });

  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title);
      // Load document context (variables) from persisted aiMemory
      if (notebook.aiMemory) {
        const memory = notebook.aiMemory as any;
        setPersistedAiMemory(memory);
        if (memory.plan) {
          setCurrentPlan(memory.plan);
        }
      }
    }
  }, [notebook]);

  // Load messages from database
  useEffect(() => {
    if (loadedMessages && loadedMessages.length > 0) {
      // Add expanded: false for expandable messages (isExpandable is "true" string or null)
      // For expandable messages, look up the current section content by title
      const messagesWithExpanded = loadedMessages.map(msg => {
        const isExpandable = (msg.isExpandable as any) === "true";
        let sectionContent = undefined;
        
        if (isExpandable && msg.sectionTitle && sections.length > 0) {
          const matchingSection = sections.find(s => s.title === msg.sectionTitle);
          if (matchingSection) {
            sectionContent = matchingSection.content;
          }
        }
        
        return {
          ...msg,
          isExpandable,
          sectionContent,
          expanded: isExpandable ? false : undefined
        };
      });
      setMessages(messagesWithExpanded);
    } else if (!messagesLoading && loadedMessages.length === 0) {
      // If no messages exist, show welcome message (but don't save it)
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Ready to edit your notebook. Give me instructions and I'll update the sections directly."
        }
      ]);
    }
  }, [loadedMessages, messagesLoading, sections]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track elapsed time during AI processing
  useEffect(() => {
    if (processingStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [processingStartTime]);

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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Validate response has required fields
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from AI service');
      }
      
      return result;
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

  const saveMessage = useMutation({
    mutationFn: async (data: { notebookId: string; role: "user" | "assistant"; content: string }) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id, "messages"] });
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
    
    // Save user message to database
    saveMessage.mutate({
      notebookId: id!,
      role: "user",
      content: input
    });
    
    const instruction = input;
    setInput("");
    
    try {
      console.log("AI is editing notebook...");
      setProcessingStartTime(Date.now()); // Start tracking time
      
      // Keep calling AI until complete
      let aiMemory: any = persistedAiMemory || undefined; // Use persisted memory if available
      let isComplete = false;
      let iterationCount = 0;
      // No iteration limit - run until AI marks complete
      while (!isComplete) {
        iterationCount++;
        
        // Always fetch fresh sections before calling AI
        const freshSectionsResponse = await fetch(`/api/notebooks/${id}/sections`);
        const freshSections = await freshSectionsResponse.json();
        const currentSections = Array.isArray(freshSections) ? freshSections.map((s: any) => ({ 
          id: s.id, 
          title: s.title, 
          content: s.content || '' 
        })) : [];
        console.log(`📝 Fresh sections (iteration ${iterationCount}):`, currentSections);
        
        // Let AI service determine completion through its review/postprocess phases
        // Don't early-exit - trust the AI workflow to complete properly
        
        // Track timing for this API call
        const apiStartTime = Date.now();
        const result = await generateAI.mutateAsync({ 
          instruction: iterationCount === 1 ? instruction : "", // Send instruction on first iteration only
          notebookId: id!, 
          sections: currentSections,
          aiMemory
        });
        const apiEndTime = Date.now();
        const apiDuration = ((apiEndTime - apiStartTime) / 1000).toFixed(2);
        console.log(`AI Response (iteration ${iterationCount}):`, result);
        console.log(`API call took ${apiDuration}s`);
        
        // Add progress message if available (during execute phase)
        if (result.progressMessage) {
          const progressMsg: Message = {
            id: `progress-${Date.now()}`,
            role: "assistant",
            content: result.progressMessage
          };
          setMessages(prev => [...prev, progressMsg]);
          
          // Save progress message to database
          saveMessage.mutate({
            notebookId: id!,
            role: "assistant",
            content: result.progressMessage
          });
        }
        
        // Create descriptive timing message based on what was done
        let timingDescription = "Completed";
        if (result.phase === "plan") {
          timingDescription = "Planned document structure";
        } else if (result.phase === "execute" && result.actions && result.actions.length > 0) {
          const action = result.actions[0];
          const actionVerb = action.type === "create" ? "Created" : "Wrote";
          timingDescription = `${actionVerb} ${action.sectionId}`;
        } else if (result.phase === "review") {
          timingDescription = "Reviewed content";
        } else if (result.phase === "postprocess") {
          timingDescription = "Post-processed content";
        }
        
        // Add timing message to chat
        const timingMessage: Message = {
          id: `timing-${Date.now()}`,
          role: "assistant",
          content: `⏱️ ${timingDescription} in ${apiDuration}s`
        };
        setMessages(prev => [...prev, timingMessage]);
        
        // Save timing message to database
        saveMessage.mutate({
          notebookId: id!,
          role: "assistant",
          content: `⏱️ ${timingDescription} in ${apiDuration}s`
        });
        
        // Update phase and plan
        const previousPhase = aiPhase;
        setAiPhase(result.phase || null);
        if (result.plan) {
          setCurrentPlan(result.plan);
        }
        
        // Update phase without showing messages
        // (Phase indicator is shown in the UI status bar instead)
        
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
              console.warn(`Skipping invalid action:`, action);
              continue;
            }

            console.log(`Applying action: ${action.type} on ${action.sectionId}`);
            
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
                  console.log(`Updated section: ${targetSection.title}`);
                  
                  // Add completion message to chat (summary only - content is expandable)
                  const completionMsg: Message = {
                    id: `completion-${Date.now()}-${targetSection.id}`,
                    role: "system",
                    content: `Finished making: ${targetSection.title}`,
                    sectionTitle: targetSection.title,
                    sectionContent: action.content, // Store content separately for expansion
                    isExpandable: true,
                    expanded: false
                  };
                  setMessages(prev => [...prev, completionMsg]);
                  
                  // Save completion message to database (use assistant role for compatibility)
                  saveMessage.mutate({
                    notebookId: id!,
                    role: "assistant" as any,
                    content: `Finished making: ${targetSection.title}`,
                    sectionTitle: targetSection.title,
                    isExpandable: "true"
                  } as any);
                  
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
                console.warn(`Section ${action.sectionId} not found for update`);
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
                console.log(`Created new section: ${action.sectionId}`);
                
                // Add completion message to chat (summary only - content is expandable)
                const completionMsg: Message = {
                  id: `completion-${Date.now()}-${newSection.id}`,
                  role: "system",
                  content: `Finished making: ${action.sectionId}`,
                  sectionTitle: action.sectionId,
                  sectionContent: action.content, // Store content separately for expansion
                  isExpandable: true,
                  expanded: false
                };
                setMessages(prev => [...prev, completionMsg]);
                
                // Save completion message to database (use assistant role for compatibility)
                saveMessage.mutate({
                  notebookId: id!,
                  role: "assistant" as any,
                  content: `Finished making: ${action.sectionId}`,
                  sectionTitle: action.sectionId,
                  isExpandable: "true"
                } as any);
                
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
        
        // Break conditions
        if (isComplete) {
          console.log("AI reports work is complete");
          break;
        }
        
        if (!result.shouldContinue) {
          console.warn("AI paused (may have questions or need user input)");
          // Persist AI memory so user's answer can resume the flow
          setPersistedAiMemory(result.aiMemory || aiMemory);
          // Use the AI's actual message (may contain questions)
          const pauseMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.message || "I need more information. Please provide additional details.",
          };
          setMessages(prev => [...prev, pauseMessage]);
          
          // Save pause message to database
          saveMessage.mutate({
            notebookId: id!,
            role: "assistant",
            content: result.message || "I need more information. Please provide additional details."
          });
          
          setAiPhase(null);
          setProcessingStartTime(null); // Stop tracking time
          return; // Exit early, don't add another message
        }
        
        // Continue looping
        console.log("🔄 AI workflow continuing...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between calls
      }
      
      // Clear phase indicator and persisted memory on completion
      setAiPhase(null);
      setPersistedAiMemory(null); // Clear memory to avoid stale context
      setProcessingStartTime(null); // Stop tracking time
      
      // Completion message
      let completionMessage = "Document complete! ✨";
      
      // Add final AI message to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: completionMessage,
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Save completion message to database
      saveMessage.mutate({
        notebookId: id!,
        role: "assistant",
        content: completionMessage
      });
    } catch (error: any) {
      console.error("❌ AI error:", error);
      setAiPhase(null);
      setPersistedAiMemory(null); // Clear memory on error
      setProcessingStartTime(null); // Stop tracking time
      
      let errorText = "Sorry, I encountered an error. Please try again.";
      
      // Network or fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorText = "Unable to connect to the AI service. Please check your internet connection and try again.";
      }
      // Explicit error messages from the API
      else if (error?.message) {
        // Make error messages more user-friendly
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorText = "The AI service is currently overloaded (rate limit reached). Please wait a moment and try again, or try a simpler prompt.";
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorText = "Authentication error with the AI service. Please refresh the page and try again.";
        } else if (error.message.includes('404')) {
          errorText = "The AI service endpoint could not be found. This might be a temporary issue - please try again.";
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          errorText = "The AI service is experiencing issues. Please try again in a moment.";
        } else if (error.message.includes('Invalid response')) {
          errorText = "Received an invalid response from the AI service. This might be due to service issues - please try again.";
        } else {
          errorText = `Error: ${error.message}`;
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: errorText
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to database
      saveMessage.mutate({
        notebookId: id!,
        role: "assistant",
        content: errorText
      });
    }
  };

  if (!notebook || !id || id === "undefined") {
    return <div className="p-12">Loading...</div>;
  }

  return (
    <div className="h-screen flex bg-background">
      {!isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border p-4 flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent"
              data-testid="input-notebook-title"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-notebook-menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const newTitle = prompt("Enter new title:", title);
                  if (newTitle && newTitle.trim()) {
                    setTitle(newTitle);
                    updateTitle.mutate(newTitle);
                  }
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this notebook? This cannot be undone.")) {
                      fetch(`/api/notebooks/${id}`, { method: "DELETE" })
                        .then(() => window.location.href = "/")
                        .catch(err => console.error("Delete failed:", err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {aiPhase && (
              <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <div>
                      <p className="text-sm font-medium">
                        {aiPhase === "plan" && "Planning your document..."}
                        {aiPhase === "execute" && "Writing content..."}
                        {aiPhase === "review" && "Reviewing and polishing..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Feel free to step away - I'll keep working in the background
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">{elapsedTime}s</span>
                </div>
              </div>
            )}
            {messages.map((message) => {
              if (message.role === "system" && message.isExpandable) {
                return (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-600 text-white">
                        <Sparkles className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Card 
                      className="p-3 max-w-[80%] cursor-pointer hover-elevate"
                      onClick={() => {
                        setMessages(prev => prev.map(m => 
                          m.id === message.id ? { ...m, expanded: !m.expanded } : m
                        ));
                      }}
                      data-testid={`system-message-${message.sectionTitle}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                        <span>{message.content}</span>
                      </div>
                      {message.expanded && message.sectionContent && (
                        <div className="mt-2 pt-2 border-t border-border text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground line-clamp-none">
                          {message.sectionContent}
                        </div>
                      )}
                      {!message.expanded && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Click to show content
                        </div>
                      )}
                    </Card>
                  </div>
                );
              }
              
              return (
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
              );
            })}
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
      )}

      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border p-4 flex items-center justify-between gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent"
              data-testid="input-notebook-title-expanded"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              data-testid="button-collapse-document"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {Array.isArray(sections) && sections.map((section, index) => (
                <Card
                  key={section.id}
                  className={`p-6 bg-accent/20 transition-all duration-300 ${
                    recentlyUpdatedSections.has(section.id) ? 'animate-flash-border' : ''
                  }`}
                  data-testid={`section-card-${section.id}`}
                >
                  <h2 className="text-2xl font-bold mb-4">{index + 1}. {section.title}</h2>
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {section.content || "No content yet."}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {!isExpanded && (
        <div className="w-80 lg:w-96 xl:w-[28rem] 2xl:w-[32rem] p-4 bg-card overflow-auto">
        {currentPlan && currentPlan.variables && (
          <Accordion type="single" collapsible className="mb-3" value={isContextOpen} onValueChange={setIsContextOpen}>
            <AccordionItem value="context" className="border rounded-lg px-2">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline py-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Context
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pb-1.5 text-xs">
                  {currentPlan.variables.topic && (
                    <div className="flex gap-1.5">
                      <span className="font-medium text-muted-foreground">Topic:</span>
                      <span className="text-foreground">{currentPlan.variables.topic}</span>
                    </div>
                  )}
                  {currentPlan.variables.targetLength && (
                    <div className="flex gap-1.5">
                      <span className="font-medium text-muted-foreground">Length:</span>
                      <span className="text-foreground">{currentPlan.variables.targetLength}</span>
                    </div>
                  )}
                  {currentPlan.variables.documentType && (
                    <div className="flex gap-1.5">
                      <span className="font-medium text-muted-foreground">Type:</span>
                      <span className="text-foreground">{currentPlan.variables.documentType}</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Chapters</h3>
          </div>
          <div className="flex items-center gap-2">
            {!isContextOpen && sections.length > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5" data-testid="progress-indicator">
                {sections.filter(s => s.content && s.content.length >= 500).length}/{sections.length}
              </Badge>
            )}
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
        </div>
        <div className="space-y-3">
          {Array.isArray(sections) && sections.map((section, index) => (
            <div key={section.id}>
              <button
                onClick={() => !isExpanded && setSelectedSection(section)}
                className={`w-full text-left p-3 rounded-md ${!isExpanded ? "hover-elevate" : ""} transition-all relative ${
                  selectedSection?.id === section.id && !isExpanded ? "bg-accent" : ""
                } ${
                  editingSections.has(section.id) ? "ring-2 ring-primary animate-pulse" : ""
                } ${
                  recentlyUpdatedSections.has(section.id) ? "bg-primary/20 ring-1 ring-primary/50" : ""
                }`}
                data-testid={`chapter-link-${section.title.toLowerCase()}`}
              >
                <div className="font-medium text-foreground text-sm mb-1 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    !section.content || section.content.length < 100 
                      ? 'bg-red-500' 
                      : section.content.length < 500 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }`} />
                  {index + 1}. {section.title}
                  {editingSections.has(section.id) && (
                    <Sparkles className="h-3 w-3 text-primary animate-spin" />
                  )}
                </div>
                {!isExpanded && section.content && (
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {section.content}
                  </div>
                )}
              </button>
              {isExpanded && section.content && (
                <div className="pl-3 pr-2 py-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              )}
            </div>
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
      )}
    </div>
  );
}
