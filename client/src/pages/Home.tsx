import { Card } from "@/components/ui/card";
import { FileText, Plus, Clock, MoreVertical, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { Notebook } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

  const deleteNotebook = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notebooks/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
    },
  });

  const handleCreateNotebook = (title: string, emoji: string, sections: Array<{ title: string; orderIndex: string }>) => {
    createNotebook.mutate({ title, emoji, sections });
  };

  const handleDeleteNotebook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotebook.mutate(id);
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
                className="p-6 hover-elevate cursor-pointer transition-all relative group"
                onClick={() => setLocation(`/notebook/${notebook.id}`)}
                data-testid={`card-notebook-${notebook.id}`}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`button-menu-${notebook.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => handleDeleteNotebook(e, notebook.id)}
                        data-testid={`menu-item-delete-${notebook.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-medium text-foreground mb-1">{notebook.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notebook.updatedAt), { addSuffix: true })}
                </p>
              </Card>
            ))}
            
            <Card 
              className="p-6 hover-elevate cursor-pointer transition-all border-dashed flex flex-col items-center justify-center min-h-[140px]"
              onClick={() => handleCreateNotebook("Untitled Notebook", "", [])}
              data-testid="card-new-notebook"
            >
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">New notebook</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
