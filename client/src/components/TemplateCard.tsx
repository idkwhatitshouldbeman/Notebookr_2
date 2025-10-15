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
    <Card className="p-8 hover-elevate transition-all text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      
      <h3 className="font-semibold mb-2 text-foreground text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      
      <Button 
        className="w-full rounded-full" 
        onClick={onSelect}
        data-testid={`button-select-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        Use Template
      </Button>
    </Card>
  );
}
