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
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Notebook } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: notebooks = [] } = useQuery<Notebook[]>({
    queryKey: ["/api/notebooks"],
  });

  const privatePages = notebooks.slice(0, 10);
  const isSettingsPage = location === "/settings";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-4">
        <Link href="/" className="inline-flex hover-elevate active-elevate-2 rounded-lg px-3 py-2 bg-primary" data-testid="link-home-logo">
          <span className="font-semibold text-primary-foreground">Notebookr</span>
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

        {!isSettingsPage && privatePages.length > 0 && (
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
