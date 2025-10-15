import { AIPanel } from "../AIPanel";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AIPanelExample() {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="relative h-screen bg-background">
      <div className="p-6">
        <Button onClick={() => setIsOpen(!isOpen)}>Toggle AI Panel</Button>
      </div>
      <AIPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
