import { create } from 'zustand';

interface SidebarStore {
  isOpen: boolean;
  isCollapsed: boolean;
  expandedGroups: string[];
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleGroup: (group: string) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  isCollapsed: false,
  expandedGroups: ['업무', '고객', '운영'],
  setOpen: (open) => set({ isOpen: open }),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  toggleGroup: (group) =>
    set((state) => ({
      expandedGroups: state.expandedGroups.includes(group)
        ? state.expandedGroups.filter((g) => g !== group)
        : [...state.expandedGroups, group],
    })),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
