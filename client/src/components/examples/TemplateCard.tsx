import { TemplateCard } from "../TemplateCard";
import { Beaker } from "lucide-react";

export default function TemplateCardExample() {
  return (
    <div className="p-6 bg-background max-w-md">
      <TemplateCard
        icon={Beaker}
        title="Lab Report"
        description="Standard laboratory experiment documentation"
        sections={["Objectives", "Methods", "Results", "Discussion"]}
        onSelect={() => console.log("Template selected")}
      />
    </div>
  );
}
