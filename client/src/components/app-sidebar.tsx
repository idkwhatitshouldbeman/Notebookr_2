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
import { FileText, Home, Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Notebook } from "@shared/schema";

export function AppSidebar() {
  const { data: notebooks = [] } = useQuery<Notebook[]>({
    queryKey: ["/api/notebooks"],
  });

  const privatePages = notebooks.slice(0, 10);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-4">
        <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg p-2 -m-2" data-testid="link-home-logo">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-bold text-sm text-primary-foreground">N</span>
          </div>
          <span className="font-semibold text-sidebar-foreground">Notebookr</span>
        </Link>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-sidebar-accent border-0"
            data-testid="input-search"
          />
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {privatePages.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Private</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {privatePages.map((page) => (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/notebook/${page.id}`} data-testid={`link-notebook-${page.id}`}>
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{page.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
