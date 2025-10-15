import { NotebookEditor } from "../NotebookEditor";

export default function NotebookEditorExample() {
  return (
    <div className="h-screen bg-background">
      <NotebookEditor onAIGenerate={() => console.log("AI generate triggered")} />
    </div>
  );
}
