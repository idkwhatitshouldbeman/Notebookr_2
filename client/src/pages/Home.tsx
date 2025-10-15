import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Clock } from "lucide-react";

const recentNotebooks = [
  { id: 1, title: "Heat Transfer Lab", emoji: "🔥", lastEdited: "2 hours ago" },
  { id: 2, title: "Circuit Design", emoji: "⚡", lastEdited: "Yesterday" },
  { id: 3, title: "Fluid Dynamics", emoji: "💧", lastEdited: "3 days ago" },
];

export default function Home() {
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
                onClick={() => console.log(`Open ${notebook.title}`)}
                data-testid={`card-notebook-${notebook.id}`}
              >
                <div className="text-3xl mb-3">{notebook.emoji}</div>
                <h3 className="font-medium text-foreground mb-1">{notebook.title}</h3>
                <p className="text-sm text-muted-foreground">{notebook.lastEdited}</p>
              </Card>
            ))}
            
            <Card 
              className="p-6 hover-elevate cursor-pointer transition-all border-dashed flex flex-col items-center justify-center min-h-[140px]"
              onClick={() => console.log("Create new notebook")}
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
            {[
              { name: "Lab Report", icon: "🧪" },
              { name: "Design Document", icon: "📐" },
              { name: "Project Log", icon: "📝" },
            ].map((template) => (
              <button
                key={template.name}
                className="w-full text-left px-4 py-3 rounded-lg hover-elevate transition-all flex items-center gap-3"
                onClick={() => console.log(`Select ${template.name}`)}
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
