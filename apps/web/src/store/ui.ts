import { create } from "zustand";

/** Estado de UI puro (no de servidor). El estado de servidor vive en React Query. */
interface UiState {
  // ancla del planner: primer día visible (YYYY-MM-DD)
  fechaAncla: string;
  diasVisibles: number;
  setFechaAncla: (f: string) => void;
  avanzar: (dias: number) => void;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useUi = create<UiState>((set) => ({
  fechaAncla: hoyISO(),
  diasVisibles: 14,
  setFechaAncla: (fechaAncla) => set({ fechaAncla }),
  avanzar: (dias) =>
    set((s) => {
      const d = new Date(s.fechaAncla);
      d.setDate(d.getDate() + dias);
      return { fechaAncla: d.toISOString().slice(0, 10) };
    }),
}));
