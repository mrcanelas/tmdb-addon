import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MetaLayerTheme } from '@metalayer/shared-ui';

export type ConfigureUiMode = 'simple' | 'advanced';

interface ConfigureUiState {
  mode: ConfigureUiMode;
  theme: MetaLayerTheme;
  sidebarMinimized: boolean;
  commandPaletteOpen: boolean;
  donateModalOpen: boolean;
  setMode: (mode: ConfigureUiMode) => void;
  toggleMode: () => void;
  setTheme: (theme: MetaLayerTheme) => void;
  toggleTheme: () => void;
  setSidebarMinimized: (minimized: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setDonateModalOpen: (open: boolean) => void;
  openDonateModal: () => void;
  closeDonateModal: () => void;
}

export const useConfigureUiStore = create<ConfigureUiState>()(
  persist(
    (set, get) => ({
      mode: 'simple',
      theme: 'dark',
      sidebarMinimized: true,
      commandPaletteOpen: false,
      donateModalOpen: false,
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set({ mode: get().mode === 'simple' ? 'advanced' : 'simple' }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setSidebarMinimized: (sidebarMinimized) => set({ sidebarMinimized }),
      toggleSidebar: () =>
        set({ sidebarMinimized: !get().sidebarMinimized }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      setDonateModalOpen: (donateModalOpen) => set({ donateModalOpen }),
      openDonateModal: () => set({ donateModalOpen: true }),
      closeDonateModal: () => set({ donateModalOpen: false }),
    }),
    {
      name: 'metalayer.configure.ui',
      partialize: (state) => ({
        mode: state.mode,
        theme: state.theme,
        sidebarMinimized: state.sidebarMinimized,
      }),
    },
  ),
);
