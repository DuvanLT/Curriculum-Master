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

    if (!initialized.value && !loading.value) {
      await fetchProfile()
    }
  },
  { immediate: true }
)
</script>
