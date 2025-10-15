import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface TemplateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  sections: string[];
  onSelect: () => void;
}

export function TemplateCard({ icon: Icon, title, description, sections, onSelect }: TemplateCardProps) {
  return (
    <Card className="p-6 hover-elevate transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1 text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">INCLUDES:</p>
        <div className="flex flex-wrap gap-2">
          {sections.map((section, i) => (
            <span 
              key={i}
              className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground"
            >
              {section}
            </span>
          ))}
        </div>
      </div>
      
      <Button 
        className="w-full" 
        variant="outline"
        onClick={onSelect}
        data-testid={`button-select-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        Use Template
      </Button>
    </Card>
  );
}
