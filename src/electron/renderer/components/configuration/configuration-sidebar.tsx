import * as A from "effect/Array";
import * as Match from "effect/Match";
import * as R from "effect/Record";
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/electron/renderer/components/ui/collapsible.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/electron/renderer/components/ui/select.tsx";
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
  ConfigurationUpdatedAtAscendingOrder,
  ConfigurationUpdatedAtDescendingOrder,
  useConfigurationActions,
  useConfigurationGroups,
  useSelectedConfigurationId,
} from "@/electron/renderer/stores/configurations-store/configurations-store.tsx";
import { useFellowshipDataStore } from "@/electron/renderer/stores/fellowship-data/fellowship-data-store.tsx";
import { formatLocalDateTime } from "@/electron/renderer/util/format-date-time.ts";

import {
  CONFIGURATION_SORT_OPTIONS,
  type ConfigurationSort,
  ConfigurationSortOptionContent,
  DEFAULT_CONFIGURATION_SORT,
  getConfigurationSortOption,
} from "./configuration-sort";

export function ConfigurationSidebar() {
  const [sort, setSort] = useState<ConfigurationSort>(
    DEFAULT_CONFIGURATION_SORT,
  );

  const configurationGroups = useConfigurationGroups();
  const selectedConfigurationId = useSelectedConfigurationId();

  const { deleteConfiguration, selectConfiguration } =
    useConfigurationActions();

  const dungeons = useFellowshipDataStore((state) => state.dungeons);

  const dungeonsById = R.fromIterableBy(dungeons, (dungeon) => {
    return dungeon.id;
  });

  const selectedSortOption = getConfigurationSortOption(sort);

  const configurationOrder = Match.value(sort).pipe(
    Match.when(
      "UPDATED_DESCENDING",
      () => ConfigurationUpdatedAtDescendingOrder,
    ),
    Match.when("UPDATED_ASCENDING", () => ConfigurationUpdatedAtAscendingOrder),
    Match.exhaustive,
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="shrink-0 border-b py-2">
        <div className="space-y-2 px-2">
          <div>
            <div className="text-sm font-semibold">Saved configurations</div>
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="configuration-sort"
            >
              Sort
            </label>
            <Select
              value={sort}
              onValueChange={(value) => {
                Match.value(value).pipe(
                  Match.when("UPDATED_DESCENDING", setSort),
                  Match.when("UPDATED_ASCENDING", setSort),
                  Match.orElse(() => undefined),
                );
              }}
            >
              <SelectTrigger className="w-full" id="configuration-sort">
                <SelectValue>
                  <ConfigurationSortOptionContent option={selectedSortOption} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONFIGURATION_SORT_OPTIONS.map((option) => {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <ConfigurationSortOptionContent option={option} />
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
                            const configurations = A.sort(
                              levelGroup.configurations,
                              configurationOrder,
                            );

                            return (
                              <Collapsible
                                className="group/level"
                                defaultOpen
                                key={levelGroup.dungeonLevel}
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger
                                    render={
                                      <SidebarMenuSubButton
                                        render={<button type="button" />}
                                      >
                                        <ChevronRightIcon className="transition-transform group-data-[state=open]/level:rotate-90" />
                                        <span>
                                          Eternal {levelGroup.dungeonLevel}
                                        </span>
                                      </SidebarMenuSubButton>
                                    }
                                  />
                                  <CollapsibleContent className="mt-1">
                                    <SidebarMenuSub className="mr-0">
                                      {configurations.map((configuration) => {
                                        const isActive =
                                          configuration.id ===
                                          selectedConfigurationId;

                                        return (
                                          <SidebarMenuSubItem
                                            key={configuration.id}
                                          >
                                            <div
                                              className="grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 rounded-md px-2 py-1.5 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                                              data-active={isActive}
                                            >
                                              <FileTextIcon className="col-start-1 row-start-1" />
                                              <SidebarMenuSubButton
                                                className="col-start-2 row-start-1 h-auto min-w-0 justify-start p-0 text-left hover:bg-transparent active:bg-transparent"
                                                render={
                                                  <button type="button" />
                                                }
                                                onClick={() => {
                                                  selectConfiguration(
                                                    configuration.id,
                                                  );
                                                }}
                                              >
                                                <span className="truncate">
                                                  {configuration.label}
                                                </span>
                                              </SidebarMenuSubButton>
                                              <Button
                                                aria-label={`Delete ${configuration.label}`}
                                                className="col-start-3 row-start-1 justify-self-end"
                                                size="icon-xs"
                                                type="button"
                                                variant="destructive"
                                                onClick={() => {
                                                  deleteConfiguration(
                                                    configuration.id,
                                                  );
                                                }}
                                              >
                                                <Trash2Icon />
                                              </Button>
                                              <button
                                                className="col-span-3 col-start-1 row-start-2 min-w-0 truncate text-left text-xs font-normal text-muted-foreground"
                                                type="button"
                                                onClick={() => {
                                                  selectConfiguration(
                                                    configuration.id,
                                                  );
                                                }}
                                              >
                                                {formatLocalDateTime(
                                                  configuration.updatedAt,
                                                )}
                                              </button>
                                            </div>
                                          </SidebarMenuSubItem>
                                        );
                                      })}
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
