export interface Profile {
  nombre: string;
  titulo: string;
  ubicacion: string;
  email_profile: string;
  telefono: string;
  linkedin: string;
  otros: string;
  web: string;
  educacion: string;
  resumen: string;
  years: string;
}

export interface Education {
  id?: string | number;
  titulo: string;
  institucion: string;
  inicio: string;
  fin: string;
  descripcion: string;
}

export interface Experience {
  id?: string | number;
  type: 'work' | 'project';
  cargo: string;
  empresa: string;
  inicio: string;
  fin: string;
  logros: string;
  skills: string[];
}

function normalizeEducationSummary(educations: Education[]) {
  return educations
    .map(edu => [edu.titulo, edu.institucion, edu.fin || edu.inicio].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n')
}

export const useAppState = () => {
  const profile = useState<Profile>('profile', () => ({
    nombre: '',
    titulo: '',
    ubicacion: '',
    email_profile: '',
    telefono: '',
    linkedin: '',
    otros: '',
    web: '',
    educacion: '',
    resumen: '',
    years: ''
  }));

  const educations = useState<Education[]>('educations', () => []);
  const experiences = useState<Experience[]>('experiences', () => []);
  const loading = useState('app-loading', () => false);
  const initialized = useState('app-profile-initialized', () => false);
  const hasData = useState('app-profile-has-data', () => false);
  const pendingRequest = useState<Promise<void> | null>('app-profile-pending-request', () => null);

  const hasProfileData = (value: Profile) => {
    return Boolean(
      value.nombre ||
      value.titulo ||
      value.ubicacion ||
      value.email_profile ||
      value.telefono ||
      value.linkedin ||
      value.otros ||
      value.web ||
      value.educacion ||
      value.resumen ||
      value.years
    )
  }

  const resetProfileState = () => {
    profile.value = {
      nombre: '',
      titulo: '',
      ubicacion: '',
      email_profile: '',
      telefono: '',
      linkedin: '',
      otros: '',
      web: '',
      educacion: '',
      resumen: '',
      years: ''
    };
    educations.value = [];
    experiences.value = [];
    loading.value = false;
    initialized.value = false;
    hasData.value = false;
    pendingRequest.value = null;
  }

  const syncEducationSummary = () => {
    profile.value.educacion = normalizeEducationSummary(educations.value)
  }

  const fetchProfile = async (force = false) => {
    if (pendingRequest.value && !force) {
      return pendingRequest.value;
    }

    if (initialized.value && !force) {
      return;
    }

    loading.value = true;
    pendingRequest.value = (async () => {
      try {
        const data = await $fetch<{ profile: Profile, educations: Education[], experiences: Experience[] }>('/api/profile');
        profile.value = data.profile;
        educations.value = Array.isArray(data.educations) ? data.educations : [];
        experiences.value = Array.isArray(data.experiences) ? data.experiences : [];
        syncEducationSummary()
        hasData.value = hasProfileData(profile.value) || educations.value.length > 0 || experiences.value.length > 0
        initialized.value = true;
      } catch (e) {
        console.error('Error fetching profile:', e);
      } finally {
        loading.value = false;
        pendingRequest.value = null;
      }
    })();

    return pendingRequest.value;
  };

  const ensureProfileLoaded = async () => {
    if (pendingRequest.value) {
      await pendingRequest.value;
      return;
    }

    if (initialized.value) {
      return;
    }

    await fetchProfile();
  };

  const saveProfile = async () => {
    try {
      syncEducationSummary()
      await $fetch<any>('/api/profile', {
        method: 'POST',
        body: {
          profile: {
            ...profile.value,
            years: profile.value.years?.toString() || '0'
          },
          educations: educations.value,
          experiences: experiences.value
        }
      });
    } catch (e) {
      console.error('Error saving profile:', e);
      throw e;
    }
  };

  const mergeImportedProfile = (data: Partial<Profile> & { github?: string }) => {
    profile.value = {
      ...profile.value,
      nombre: data.nombre || profile.value.nombre,
      titulo: data.titulo || profile.value.titulo,
      ubicacion: data.ubicacion || profile.value.ubicacion,
      email_profile: data.email_profile || profile.value.email_profile,
      telefono: data.telefono || profile.value.telefono,
      linkedin: data.linkedin || profile.value.linkedin,
      otros: data.otros || data.github || profile.value.otros,
      web: data.web || profile.value.web,
      educacion: data.educacion || profile.value.educacion,
      resumen: data.resumen || profile.value.resumen,
      years: data.years?.toString() || profile.value.years
    };
  };

  const addEducation = (newEdu: any) => {
    const education: Education = {
      id: Date.now().toString(),
      titulo: newEdu.titulo || '',
      institucion: newEdu.institucion || '',
      inicio: newEdu.inicio || '',
      fin: newEdu.fin || '',
      descripcion: newEdu.descripcion || ''
    };
    educations.value.unshift(education);
    syncEducationSummary()
    saveProfile();
  };

  const updateEducation = async (id: string | number, updatedData: any) => {
    const index = educations.value.findIndex(e => e.id === id);
    const existing = educations.value[index];
    if (index !== -1 && existing) {
      educations.value[index] = {
        ...existing,
        ...updatedData
      };
      syncEducationSummary()
      await saveProfile();
    }
  };

  const removeEducation = (id: string | number) => {
    educations.value = educations.value.filter(e => e.id !== id);
    syncEducationSummary()
    saveProfile();
  };

  const bulkEducation = async (items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const eduData of items) {
      const education: Education = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        titulo: eduData.titulo || '',
        institucion: eduData.institucion || '',
        inicio: eduData.inicio || '',
        fin: eduData.fin || '',
        descripcion: eduData.descripcion || ''
      };
      educations.value.unshift(education);
    }
    syncEducationSummary()
    await saveProfile();
  };

  const addExperience = (newExp: any) => {
    const exp: Experience = {
      id: Date.now().toString(),
      type: newExp.type === 'project' ? 'project' : 'work',
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

  const updateExperience = async (id: string | number, updatedData: any) => {
    const index = experiences.value.findIndex(e => e.id === id);
    const existing = experiences.value[index];
    if (index !== -1 && existing) {
      experiences.value[index] = {
        ...existing,
        ...updatedData,
        type: updatedData.type === 'project' ? 'project' : (existing.type || 'work'),
        skills: Array.isArray(updatedData.skills)
          ? updatedData.skills
          : (typeof updatedData.skills === 'string'
            ? updatedData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [])
      };
      await saveProfile();
    }
  };

  const bulkExperience = async (exps: any[]) => {
    if (!Array.isArray(exps)) return;
    for (const expData of exps) {
      const exp: Experience = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type: expData.type === 'project' ? 'project' : 'work',
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
    educations,
    experiences,
    loading,
    initialized,
    hasData,
    fetchProfile,
    ensureProfileLoaded,
    resetProfileState,
    saveProfile,
    mergeImportedProfile,
    addEducation,
    updateEducation,
    removeEducation,
    bulkEducation,
    addExperience,
    removeExperience,
    updateExperience,
    bulkExperience
  };
};
