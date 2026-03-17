import { SKILL_PATTERNS } from './constants';

export function extractHardSkills(jdText: string) {
  const freq: Record<string, number> = {};
  SKILL_PATTERNS.forEach(pat => {
    const matches = jdText.match(pat) || [];
    matches.forEach(m => {
      const k = m.toLowerCase().replace(/\s+/g, ' ').trim();
      freq[k] = (freq[k] || 0) + 1;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, count]) => ({ skill, count }));
}

export function buildUserProfile(profile: any, experiences: any[]) {
  const expText = experiences.map(e => `
Cargo: ${e.cargo} en ${e.empresa} (${e.inicio} - ${e.fin || 'Actual'})
Skills: ${(e.skills || []).join(', ')}
Logros: ${e.logros || ''}
Descripción: ${e.descripcion || ''}`).join('\n---');
  
  return `PERFIL DEL USUARIO:
Nombre: ${profile.nombre || 'N/A'}
Título: ${profile.titulo || 'N/A'}
Años de experiencia: ${profile.years || 0}
Educación: ${profile.educacion || 'N/A'}
Resumen: ${profile.resumen || 'N/A'}

EXPERIENCIAS LABORALES:${expText}`;
}
