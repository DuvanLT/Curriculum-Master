export const TRIAL_SLOTS_TOTAL = 15

// Cupos "restantes" mostrados con estrategia de escasez. Cicla 15→1→15 a medida
// que crece el conteo, sin llegar nunca a 0 (en múltiplos de TRIAL_SLOTS_TOTAL
// reinicia a TRIAL_SLOTS_TOTAL). Es puramente aritmético: no toca la base de datos.
export function computeTrialSlots(count: number): number {
  return TRIAL_SLOTS_TOTAL - (count % TRIAL_SLOTS_TOTAL)
}
