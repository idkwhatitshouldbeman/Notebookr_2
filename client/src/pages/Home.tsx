import { HeroSection } from "@/components/HeroSection";
import { TemplateCard } from "@/components/TemplateCard";
import { Beaker, FileCode, Wrench } from "lucide-react";

const templates = [
  {
    icon: Beaker,
    title: "Lab Report",
    description: "Laboratory experiment documentation",
    sections: ["Objectives", "Methods", "Results"],
  },
  {
    icon: FileCode,
    title: "Design Document",
    description: "Technical design documentation",
    sections: ["Overview", "Design", "Implementation"],
  },
  {
    icon: Wrench,
    title: "Project Log",
    description: "Project progress tracking",
    sections: ["Summary", "Progress", "Next Steps"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold mb-3 text-foreground">Templates</h2>
          <p className="text-muted-foreground">
            Start with a template or create from scratch
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.title}
              {...template}
              onSelect={() => console.log(`Selected ${template.title}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
