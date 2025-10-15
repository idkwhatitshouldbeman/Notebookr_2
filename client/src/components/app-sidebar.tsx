import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { FileText, Home, Settings, Plus, Beaker, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const notebooks = [
  { id: 1, title: "Heat Transfer Lab", date: "2 days ago", status: "In Progress" },
  { id: 2, title: "Circuit Design Doc", date: "1 week ago", status: "Complete" },
  { id: 3, title: "Fluid Dynamics Report", date: "2 weeks ago", status: "Draft" },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-sidebar-foreground">EngiNote</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" data-testid="link-home">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/editor" data-testid="link-editor">
                    <FileCode className="h-4 w-4" />
                    <span>Editor</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/templates" data-testid="link-templates">
                    <Beaker className="h-4 w-4" />
                    <span>Templates</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Notebooks</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 mb-2">
              <Button className="w-full gap-2" size="sm" data-testid="button-new-notebook">
                <Plus className="h-4 w-4" />
                New Notebook
              </Button>
            </div>
            <SidebarMenu>
              {notebooks.map((notebook) => (
                <SidebarMenuItem key={notebook.id}>
                  <SidebarMenuButton asChild>
                    <Link href={`/notebook/${notebook.id}`} data-testid={`link-notebook-${notebook.id}`}>
                      <FileText className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{notebook.title}</div>
                        <div className="text-xs text-sidebar-foreground/60">{notebook.date}</div>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
