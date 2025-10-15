import { useState } from "react";
import { NotebookEditor } from "@/components/NotebookEditor";
import { AIPanel } from "@/components/AIPanel";

export default function Editor() {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1">
        <NotebookEditor onAIGenerate={() => setIsAIPanelOpen(true)} />
      </div>
      <AIPanel isOpen={isAIPanelOpen} onClose={() => setIsAIPanelOpen(false)} />
    </div>
  );
}
