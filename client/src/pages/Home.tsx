import { HeroSection } from "@/components/HeroSection";
import { TemplateCard } from "@/components/TemplateCard";
import { Beaker, FileCode, Wrench, FlaskConical } from "lucide-react";

const templates = [
  {
    icon: Beaker,
    title: "Lab Report",
    description: "Standard laboratory experiment documentation with objectives, methods, results, and discussion",
    sections: ["Objectives", "Methods", "Observations", "Discussion"],
  },
  {
    icon: FileCode,
    title: "Design Document",
    description: "Technical design documentation for engineering projects and system architecture",
    sections: ["Overview", "Requirements", "Design", "Implementation"],
  },
  {
    icon: Wrench,
    title: "Project Log",
    description: "Daily or weekly project progress tracking with milestones and action items",
    sections: ["Summary", "Progress", "Challenges", "Next Steps"],
  },
  {
    icon: FlaskConical,
    title: "Research Notes",
    description: "Academic research documentation with literature review and methodology",
    sections: ["Background", "Literature", "Methodology", "Findings"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-3 text-foreground">Choose a Template</h2>
          <p className="text-muted-foreground">
            Start with a professional template or create your own from scratch
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
