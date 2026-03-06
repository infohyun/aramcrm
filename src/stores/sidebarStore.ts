import { create } from 'zustand';

interface SidebarStore {
  isOpen: boolean;
  isCollapsed: boolean;
  expandedTeams: Record<string, boolean>;
  expandedSubs: Record<string, boolean>;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleTeam: (teamId: string) => void;
  toggleSub: (subKey: string) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  isCollapsed: false,
  expandedTeams: { 'crm-automation': true, 'after-service': true },
  expandedSubs: {},
  setOpen: (open) => set({ isOpen: open }),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  toggleTeam: (teamId) =>
    set((state) => ({
      expandedTeams: {
        ...state.expandedTeams,
        [teamId]: !state.expandedTeams[teamId],
      },
    })),
  toggleSub: (subKey) =>
    set((state) => ({
      expandedSubs: {
        ...state.expandedSubs,
        [subKey]: !state.expandedSubs[subKey],
      },
    })),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
