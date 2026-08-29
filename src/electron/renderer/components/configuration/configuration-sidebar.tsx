import * as R from "effect/Record";
import { ChevronRightIcon, FileTextIcon, FolderIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/electron/renderer/components/ui/collapsible.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/electron/renderer/components/ui/sidebar.tsx";
import {
  useConfigurationActions,
  useConfigurationGroups,
  useSelectedConfigurationId,
} from "@/electron/renderer/stores/configurations-store/configurations-store.tsx";
import { useFellowshipDataStore } from "@/electron/renderer/stores/fellowship-data/fellowship-data-store.tsx";

export function ConfigurationSidebar() {
  const configurationGroups = useConfigurationGroups();
  const selectedConfigurationId = useSelectedConfigurationId();

  const { selectConfiguration } = useConfigurationActions();

  const dungeons = useFellowshipDataStore((state) => state.dungeons);

  const dungeonsById = R.fromIterableBy(dungeons, (dungeon) => {
    return dungeon.id;
  });

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-14 shrink-0 justify-center border-b">
        <div className="px-2">
          <div className="text-sm font-semibold">Configurations</div>
          <div className="text-xs text-muted-foreground">
            Saved dungeon routes
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationGroups.map((dungeonGroup) => {
                const dungeon = dungeonsById[dungeonGroup.dungeonId];

                return (
                  <Collapsible
                    className="group/dungeon"
                    defaultOpen
                    key={dungeonGroup.dungeonId}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        nativeButton={false}
                        render={
                          <SidebarMenuButton>
                            <ChevronRightIcon className="transition-transform group-data-[state=open]/dungeon:rotate-90" />
                            <FolderIcon />
                            <span>
                              {dungeon?.name ?? dungeonGroup.dungeonId}
                            </span>
                          </SidebarMenuButton>
                        }
                      />

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dungeonGroup.levels.map((levelGroup) => {
                            return (
                              <Collapsible
                                className="group/level"
                                defaultOpen
                                key={levelGroup.dungeonLevel}
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger
                                    nativeButton={false}
                                    render={
                                      <SidebarMenuSubButton>
                                        <ChevronRightIcon className="transition-transform group-data-[state=open]/level:rotate-90" />
                                        <span>
                                          Eternal {levelGroup.dungeonLevel}
                                        </span>
                                      </SidebarMenuSubButton>
                                    }
                                  />

                                  <CollapsibleContent className="mt-1">
                                    <SidebarMenuSub>
                                      {levelGroup.configurations.map(
                                        (configuration) => {
                                          const isActive =
                                            configuration.id ===
                                            selectedConfigurationId;

                                          return (
                                            <SidebarMenuSubItem
                                              key={configuration.id}
                                            >
                                              <SidebarMenuSubButton
                                                isActive={isActive}
                                                onClick={() => {
                                                  selectConfiguration(
                                                    configuration.id,
                                                  );
                                                }}
                                              >
                                                <FileTextIcon />
                                                <span>
                                                  {configuration.label}
                                                </span>
                                              </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                          );
                                        },
                                      )}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
