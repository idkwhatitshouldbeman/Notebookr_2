import { Card } from "@/components/ui/card";
import { FileText, Plus, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { Notebook } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const templates = [
  { 
    name: "Lab Report", 
    icon: "🧪",
    sections: [
      { title: "Objectives", orderIndex: "0" },
      { title: "Methods", orderIndex: "1" },
      { title: "Observations", orderIndex: "2" },
      { title: "Conclusions", orderIndex: "3" },
    ]
  },
  { 
    name: "Design Document", 
    icon: "📐",
    sections: [
      { title: "Overview", orderIndex: "0" },
      { title: "Requirements", orderIndex: "1" },
      { title: "Design", orderIndex: "2" },
      { title: "Implementation", orderIndex: "3" },
    ]
  },
  { 
    name: "Project Log", 
    icon: "📝",
    sections: [
      { title: "Summary", orderIndex: "0" },
      { title: "Progress", orderIndex: "1" },
      { title: "Challenges", orderIndex: "2" },
      { title: "Next Steps", orderIndex: "3" },
    ]
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data: notebooks = [] } = useQuery<Notebook[]>({
    queryKey: ["/api/notebooks"],
  });

  const createNotebook = useMutation({
    mutationFn: async (data: { title: string; emoji: string; sections: Array<{ title: string; orderIndex: string }> }) => {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, emoji: data.emoji }),
      });
      const notebook = await response.json();
      
      // Create sections
      for (const section of data.sections) {
        await fetch("/api/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notebookId: notebook.id,
            title: section.title,
            content: "",
            orderIndex: section.orderIndex,
          }),
        });
      }
      
      return notebook;
    },
    onSuccess: (notebook) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
      setLocation(`/notebook/${notebook.id}`);
    },
  });

  const handleCreateNotebook = (title: string, emoji: string, sections: Array<{ title: string; orderIndex: string }>) => {
    createNotebook.mutate({ title, emoji, sections });
  };

  const recentNotebooks = notebooks.slice(0, 5);

  return (
    <div className="min-h-screen p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-12 text-foreground">Welcome home</h1>
        
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recently visited
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotebooks.map((notebook) => (
              <Card 
                key={notebook.id}
                className="p-6 hover-elevate cursor-pointer transition-all"
                onClick={() => setLocation(`/notebook/${notebook.id}`)}
                data-testid={`card-notebook-${notebook.id}`}
              >
                <div className="text-3xl mb-3">{notebook.emoji}</div>
                <h3 className="font-medium text-foreground mb-1">{notebook.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notebook.updatedAt), { addSuffix: true })}
                </p>
              </Card>
            ))}
            
            <Card 
              className="p-6 hover-elevate cursor-pointer transition-all border-dashed flex flex-col items-center justify-center min-h-[140px]"
              onClick={() => handleCreateNotebook("Untitled Notebook", "📝", [
                { title: "Section 1", orderIndex: "0" },
              ])}
              data-testid="card-new-notebook"
            >
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">New notebook</p>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-6 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Start with a template
          </h2>
          
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.name}
                className="w-full text-left px-4 py-3 rounded-lg hover-elevate transition-all flex items-center gap-3"
                onClick={() => handleCreateNotebook(template.name, template.icon, template.sections)}
                data-testid={`button-template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="text-xl">{template.icon}</span>
                <span className="text-foreground">{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
