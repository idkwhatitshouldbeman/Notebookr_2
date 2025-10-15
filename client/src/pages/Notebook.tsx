import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, FileText, User, Bot } from "lucide-react";
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
      content: "Hi! I'm here to help you write your engineering notebook. Just tell me what you want to add or modify, and I'll update the appropriate sections for you."
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (data: { prompt: string; context: Array<{ title: string; content: string }> }) => {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });

  const handleTitleBlur = () => {
    if (title !== notebook?.title) {
      updateTitle.mutate(title);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    const userPrompt = input;
    setInput("");

    const context = sections.map(s => ({ title: s.title, content: s.content }));
    
    try {
      const result = await generateAI.mutateAsync({ prompt: userPrompt, context });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.content,
      };
      setMessages(prev => [...prev, aiMessage]);

      const targetSection = sections.find(s => 
        userPrompt.toLowerCase().includes(s.title.toLowerCase()) || 
        result.content.toLowerCase().includes(s.title.toLowerCase())
      ) || sections[0];

      if (targetSection) {
        const newContent = targetSection.content 
          ? `${targetSection.content}\n\n${result.content}` 
          : result.content;
        
        await updateSection.mutateAsync({ 
          sectionId: targetSection.id, 
          content: newContent 
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/notebooks", id, "sections"] });
      }
    } catch (error) {
      console.error("AI generation error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error generating content. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!notebook) {
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
          <div className="max-w-3xl mx-auto space-y-4">
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

        <div className="border-t border-border p-4">
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
              placeholder="Tell me what to write... (e.g., 'Add an objectives section about measuring thermal conductivity')"
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
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`w-full text-left p-3 rounded-md hover-elevate transition-all ${
                selectedSection === section.id ? "bg-accent" : ""
              }`}
              data-testid={`chapter-link-${section.title.toLowerCase()}`}
            >
              <div className="font-medium text-foreground text-sm mb-1">
                {index + 1}. {section.title}
              </div>
              {section.content && (
                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {section.content}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
