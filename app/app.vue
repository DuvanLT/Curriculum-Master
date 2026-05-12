<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { loggedIn } = useAuth()
const { fetchProfile, resetProfileState, initialized, loading } = useAppState()

watch(
  loggedIn,
  async (isLoggedIn) => {
    if (!isLoggedIn) {
      resetProfileState()
      return
    }

    // Only fetch profile on the client to avoid 401s during SSR internal fetches
    if (import.meta.client && !initialized.value && !loading.value) {
      await fetchProfile()
    }
  },
  { immediate: true }
)
</script>
