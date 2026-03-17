export interface Profile {
  nombre: string;
  titulo: string;
  email: string;
  telefono: string;
  linkedin: string;
  github: string;
  web: string;
  educacion: string;
  resumen: string;
  years: string;
}

export interface Experience {
  id?: string | number;
  cargo: string;
  empresa: string;
  inicio: string;
  fin: string;
  logros: string;
  skills: string[];
}

export const useAppState = () => {
  const profile = useState<Profile>('profile', () => ({
    nombre: '',
    titulo: '',
    email: '',
    telefono: '',
    linkedin: '',
    github: '',
    web: '',
    educacion: '',
    resumen: '',
    years: ''
  }));

  const experiences = useState<Experience[]>('experiences', () => []);
  const loading = useState('app-loading', () => false);

  const fetchProfile = async () => {
    loading.value = true;
    try {
      const data = await $fetch<{ profile: Profile, experiences: Experience[] }>('/api/profile');
      profile.value = data.profile;
      experiences.value = data.experiences;
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      loading.value = false;
    }
  };

  const saveProfile = async () => {
    try {
      await $fetch('/api/profile', {
        method: 'POST',
        body: {
          profile: {
            ...profile.value,
            years: profile.value.years?.toString() || '0'
          },
          experiences: experiences.value
        }
      });
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  };

  const addExperience = (newExp: any) => {
    const exp: Experience = {
      id: Date.now().toString(),
      cargo: newExp.cargo || '',
      empresa: newExp.empresa || '',
      inicio: newExp.inicio || '',
      fin: newExp.fin || '',
      logros: newExp.logros || '',
      skills: Array.isArray(newExp.skills) 
        ? newExp.skills 
        : (typeof newExp.skills === 'string' 
            ? newExp.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
            : [])
    };
    experiences.value.unshift(exp);
    saveProfile();
  };

  const removeExperience = (id: string | number) => {
    experiences.value = experiences.value.filter(e => e.id !== id);
    saveProfile();
  };

  const bulkExperience = async (exps: any[]) => {
    if (!Array.isArray(exps)) return;
    for (const expData of exps) {
      const exp: Experience = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        cargo: expData.cargo || '',
        empresa: expData.empresa || '',
        inicio: expData.inicio || '',
        fin: expData.fin || '',
        logros: expData.logros || '',
        skills: Array.isArray(expData.skills) 
          ? expData.skills 
          : (typeof expData.skills === 'string' 
              ? expData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
              : [])
      };
      experiences.value.unshift(exp);
    }
    await saveProfile();
  };

  return {
    profile,
    experiences,
    loading,
    fetchProfile,
    saveProfile,
    addExperience,
    removeExperience,
    bulkExperience
  };
};
