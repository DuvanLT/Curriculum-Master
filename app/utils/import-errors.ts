// Código de contrato compartido con el backend (server/utils/cv-import.ts).
// El frontend no importa código de servidor; usa el literal directamente.
export function isCvNotReadable(err: any): boolean {
  if (!err) return false
  const code = err?.data?.data?.code ?? err?.data?.code
  return code === 'CV_NOT_READABLE'
}
