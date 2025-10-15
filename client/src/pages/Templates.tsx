import { TemplateCard } from "@/components/TemplateCard";
import { Beaker, FileCode, Wrench, FlaskConical, Microscope, Cpu } from "lucide-react";

const templates = [
  {
    icon: Beaker,
    title: "Lab Report",
    description: "Standard laboratory experiment documentation with objectives, methods, results, and discussion",
    sections: ["Objectives", "Methods", "Observations", "Discussion", "Conclusion"],
  },
  {
    icon: FileCode,
    title: "Design Document",
    description: "Technical design documentation for engineering projects and system architecture",
    sections: ["Overview", "Requirements", "Design", "Implementation", "Testing"],
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
    sections: ["Background", "Literature", "Methodology", "Findings", "Analysis"],
  },
  {
    icon: Microscope,
    title: "Experiment Protocol",
    description: "Detailed experimental procedure and safety protocols",
    sections: ["Introduction", "Materials", "Procedure", "Safety", "Expected Results"],
  },
  {
    icon: Cpu,
    title: "System Analysis",
    description: "Engineering system analysis and performance evaluation",
    sections: ["System Overview", "Analysis", "Performance", "Optimization", "Recommendations"],
  },
];

export default function Templates() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-foreground">Engineering Templates</h1>
          <p className="text-muted-foreground">
            Choose from our collection of professional engineering notebook templates
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
