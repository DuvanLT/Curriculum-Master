<template>
  <button
    v-if="isMobile"
    type="button"
    class="mobile-menu-button"
    :class="{ 'tour-sidebar-active': showTour }"
    @click="openMobileDrawer"
  >
    <span class="material-symbols-outlined text-[20px]">menu</span>
    <span class="sr-only">Abrir menu</span>
  </button>

  <Transition name="sidebar-overlay">
    <div
      v-if="showMobileDrawer"
      class="mobile-drawer-backdrop"
      @click="closeMobileDrawer"
    ></div>
  </Transition>

  <nav
    ref="sidebarRef"
    class="sidebar flex-shrink-0 flex flex-col relative"
    :class="sidebarClasses"
  >
    <div class="nav-section mb-6">
      <div class="nav-label text-[10px] text-text-dim px-4 mb-2 tracking-widest uppercase font-mono">{{ $t('sidebar.main') }}</div>

      <!-- Acceso rápido al perfil, arriba del dashboard. La tarjeta con foto de abajo se mantiene. -->
      <div
        v-if="user && profileNavigationItem"
        class="nav-item-shell"
        :class="getTourShellClass(profileNavigationItem.id)"
      >
        <NuxtLink
          :to="profileNavigationItem.to"
          class="nav-item"
          active-class="active"
          :title="$t('sidebar.profile_link')"
          :aria-label="$t('sidebar.profile_link')"
          @click="handleNavigationClick"
        >
          <span class="material-symbols-outlined nav-icon">{{ profileNavigationItem.icon }}</span>
          <span v-if="showItemText" class="nav-text">{{ $t('sidebar.profile_link') }}</span>
        </NuxtLink>
      </div>

      <div
        v-for="item in primaryNavigationItems"
        :key="item.id"
        :ref="setTourItemRef(item.id)"
        class="nav-item-shell"
        :class="getTourShellClass(item.id)"
      >
        <NuxtLink
          :to="item.to"
          class="nav-item"
          active-class="active"
          :class="{ 'tour-item-active': isFocusedTourItem(item.id) }"
          @click="handleNavigationClick"
        >
          <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
          <span v-if="showItemText" class="nav-text">{{ item.label }}</span>
          <span v-if="showItemText && item.badge" class="badge-beta">{{ item.badge }}</span>
          
          <div v-if="showItemText && (isItemPremium(item.id) || isItemLimited(item.id))" class="premium-badge ml-auto delayed-fade-in">
            {{ isItemLimited(item.id) ? $t('sidebar.plan_limited') : 'PRO' }}
          </div>
        </NuxtLink>
      </div>

      <div class="nav-label text-[10px] mt-6 text-text-dim px-4 mb-2 tracking-widest uppercase font-mono">{{ $t('sidebar.settings') }}</div>

      <div
        v-for="item in settingsNavigationItems"
        :key="item.id"
        :ref="setTourItemRef(item.id)"
        class="nav-item-shell"
        :class="getTourShellClass(item.id)"
      >
        <NuxtLink
          :to="item.to"
          class="nav-item"
          active-class="active"
          :class="{ 'tour-item-active': isFocusedTourItem(item.id) }"
          @click="handleNavigationClick"
        >
          <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
          <span v-if="showItemText" class="nav-text">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="mt-auto pt-6 border-t border-border/50">
      <div
        v-if="user && profileNavigationItem"
        :ref="setTourItemRef(profileNavigationItem.id)"
        class="profile-shell"
        :class="getTourShellClass(profileNavigationItem.id)"
      >
        <NuxtLink
          :to="profileNavigationItem.to"
          class="user-profile-link flex items-center gap-3 px-4 mb-4 group cursor-pointer no-underline"
          :class="{ 'tour-item-active': isFocusedTourItem(profileNavigationItem.id) }"
          @click="handleNavigationClick"
        >
          <div class="w-8 h-8 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center text-amber font-bold text-[12px] shrink-0 group-hover:bg-amber/20 transition-all">
            {{ user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase() }}
          </div>
          <div v-if="showProfileText" class="flex flex-col min-w-0">
            <div class="text-[11px] text-amber/80 font-mono truncate tracking-tight group-hover:text-amber transition-colors">{{ user.name || $t('sidebar.unnamed') }}</div>
            <div class="text-[9px] text-text-dim truncate font-mono group-hover:opacity-100 transition-opacity delayed-fade-in">
              {{ isPro ? $t('sidebar.plan_pro') : $t('sidebar.plan_free_trial') }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </nav>

  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="showTour" class="tour-backdrop" @click="completeTour"></div>
    </Transition>

    <Transition name="tour-fade">
      <div
        v-if="showTour && currentTourItem"
        ref="tourCardRef"
        class="tour-card"
        :style="tourCardStyle"
      >
        <div class="tour-card-header">
          <div>
            <div class="tour-kicker">{{ $t('sidebar.tour_kicker') }}</div>
            <div class="tour-title">{{ currentTourItem.label }}</div>
          </div>
          <button type="button" class="tour-close" @click="completeTour" aria-label="Cerrar tutorial">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="tour-step-row">
          <div class="tour-step-icon">
            <span class="material-symbols-outlined text-[18px]">{{ currentTourItem.icon }}</span>
          </div>
            {{ $t('sidebar.tour_step', { step: tourStep + 1, total: tourItems.length }) }}
        </div>

        <p class="tour-copy">{{ currentTourItem.description }}</p>
        <p class="tour-tip">{{ currentTourItem.tip }}</p>

        <div class="tour-progress">
          <span
            v-for="(_, index) in tourItems"
            :key="index"
            class="tour-dot"
            :class="{
              'tour-dot-complete': index < tourStep,
              'tour-dot-active': index === tourStep
            }"
          ></span>
        </div>

        <div class="tour-actions">
          <button type="button" class="tour-link-btn" @click="completeTour">{{ $t('sidebar.tour_skip') }}</button>
          <div class="flex items-center gap-2">
            <AppButton variant="secondary" size="sm" :disabled="tourStep === 0" @click="previousTourStep">
              {{ $t('sidebar.tour_prev') }}
            </AppButton>
            <AppButton size="sm" @click="nextTourStep">
              {{ isLastTourStep ? $t('sidebar.tour_finish') : $t('sidebar.tour_next') }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const { isPro } = useSubscription()
const {
  primaryNavigationItems,
  settingsNavigationItems,
  profileNavigationItem,
  sidebarTourSignal
} = useNavigationHelp()

const sidebarRef = ref<HTMLElement | null>(null)
const showTour = ref(false)
const tourStep = ref(0)
const tourCardStyle = ref<Record<string, string>>({})
const tourItemRefs = ref<Record<string, HTMLElement | null>>({})
const tourCardRef = ref<HTMLElement | null>(null)
const hasCompletedTour = ref(true)
const viewportWidth = ref(import.meta.client ? window.innerWidth : 1280)
const showMobileDrawer = ref(false)

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const SMALL_DESKTOP_BREAKPOINT = 1280
const STANDARD_DESKTOP_BREAKPOINT = 1536

const isMobile = computed(() => viewportWidth.value < MOBILE_BREAKPOINT)
const isTablet = computed(() => viewportWidth.value >= MOBILE_BREAKPOINT && viewportWidth.value < TABLET_BREAKPOINT)
const isSmallDesktop = computed(() => viewportWidth.value >= TABLET_BREAKPOINT && viewportWidth.value < SMALL_DESKTOP_BREAKPOINT)
const isStandardDesktop = computed(() => viewportWidth.value >= SMALL_DESKTOP_BREAKPOINT && viewportWidth.value < STANDARD_DESKTOP_BREAKPOINT)
const isLargeDesktop = computed(() => viewportWidth.value >= STANDARD_DESKTOP_BREAKPOINT)
const isCollapsed = computed(() => isTablet.value)
const showItemText = computed(() => !isCollapsed.value)
const showProfileText = computed(() => !isCollapsed.value)

const sidebarClasses = computed(() => ({
  'tour-sidebar-active': showTour.value,
  'sidebar-mobile': isMobile.value,
  'sidebar-mobile-open': isMobile.value && showMobileDrawer.value,
  'sidebar-collapsed': isCollapsed.value,
  'sidebar-small-desktop': isSmallDesktop.value,
  'sidebar-standard-desktop': isStandardDesktop.value,
  'sidebar-large-desktop': isLargeDesktop.value
}))

const tourItems = computed(() => {
  const items = [
    ...primaryNavigationItems.value,
    ...settingsNavigationItems.value
  ]

  if (user.value && profileNavigationItem.value) {
    items.push(profileNavigationItem.value)
  }

  return items
})

const currentTourItem = computed(() => tourItems.value[tourStep.value] ?? null)
const isLastTourStep = computed(() => tourStep.value === tourItems.value.length - 1)

const isItemPremium = (id: string) => {
  if (isPro.value) return false
  const premiumItems = ['coach', 'interview', 'jobs-applications']
  return premiumItems.includes(id)
}

const isItemLimited = (id: string) => {
  if (isPro.value) return false
  const limitedItems = ['analysis', 'generator-cv']
  return limitedItems.includes(id)
}

const isFocusedTourItem = (id: string) => showTour.value && currentTourItem.value?.id === id

const getTourShellClass = (id: string) => ({
  'tour-shell-active': isFocusedTourItem(id),
  'tour-shell-dimmed': showTour.value && currentTourItem.value?.id !== id
})

const setTourItemRef = (id: string) => (element: any) => {
  tourItemRefs.value[id] = (element?.$el ?? element) as HTMLElement | null

  if (showTour.value && currentTourItem.value?.id === id) {
    nextTick(() => updateTourCardPosition())
  }
}

const openMobileDrawer = () => {
  showMobileDrawer.value = true
}

const closeMobileDrawer = () => {
  showMobileDrawer.value = false
}

const updateViewportWidth = () => {
  if (!import.meta.client) {
    return
  }

  viewportWidth.value = window.innerWidth
}

const updateTourCardPosition = () => {
  if (!import.meta.client || !showTour.value || !currentTourItem.value) {
    return
  }

  const currentElement = tourItemRefs.value[currentTourItem.value.id]
  const sidebarElement = sidebarRef.value

  if (!currentElement || !sidebarElement) {
    return
  }

  const itemRect = currentElement.getBoundingClientRect()
  const sidebarRect = sidebarElement.getBoundingClientRect()
  const compactMode = window.innerWidth < 1100
  const viewportPadding = compactMode ? 16 : 24
  const cardWidth = Math.min(compactMode ? window.innerWidth - 32 : 340, 340)
  const cardHeight = tourCardRef.value?.offsetHeight ?? 320

  const left = compactMode
    ? Math.max(viewportPadding, Math.min(sidebarRect.left, window.innerWidth - cardWidth - viewportPadding))
    : Math.min(sidebarRect.right + 18, window.innerWidth - cardWidth - viewportPadding)

  const preferredTop = compactMode ? sidebarRect.bottom + 16 : itemRect.top - 6
  const maxTop = window.innerHeight - cardHeight - viewportPadding
  const top = Math.max(viewportPadding, Math.min(preferredTop, maxTop))

  tourCardStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${cardWidth}px`
  }
}

const loadTourStatus = async () => {
  if (!import.meta.client || !user.value?.id) {
    return
  }

  try {
    const response = await $fetch<{ completed: boolean }>('/api/onboarding/sidebar-tour')
    hasCompletedTour.value = Boolean(response.completed)
  } catch (error) {
    console.error('Error loading sidebar tour status:', error)
    hasCompletedTour.value = true
    return
  }

  if (!hasCompletedTour.value) {
    await startTour()
  }
}

const markTourAsCompleted = async () => {
  if (!import.meta.client || !user.value?.id || hasCompletedTour.value) {
    return
  }

  try {
    await $fetch('/api/onboarding/sidebar-tour', {
      method: 'PATCH'
    })
    hasCompletedTour.value = true
  } catch (error) {
    console.error('Error saving sidebar tour status:', error)
  }
}

const startTour = async () => {
  if (!tourItems.value.length) {
    return
  }

  tourStep.value = 0
  showTour.value = true
  await nextTick()
  updateTourCardPosition()
}

const completeTour = async () => {
  showTour.value = false
  await markTourAsCompleted()
}

const nextTourStep = () => {
  if (isLastTourStep.value) {
    completeTour()
    return
  }

  tourStep.value += 1
}

const previousTourStep = () => {
  if (tourStep.value === 0) {
    return
  }

  tourStep.value -= 1
}

const handleNavigationClick = (event: MouseEvent) => {
  if (!showTour.value) {
    closeMobileDrawer()
    return
  }

  event.preventDefault()
  event.stopPropagation()
}

const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  if (!showTour.value) {
    return
  }

  if (event.key === 'Escape') {
    completeTour()
  }

  if (event.key === 'ArrowRight') {
    nextTourStep()
  }

  if (event.key === 'ArrowLeft') {
    previousTourStep()
  }
}

watch([showTour, tourStep, tourItems], async ([tourVisible]) => {
  if (!tourVisible) {
    return
  }

  await nextTick()
  updateTourCardPosition()
})

watch(() => tourItems.value.length, length => {
  if (!length) {
    showTour.value = false
    return
  }

  if (tourStep.value > length - 1) {
    tourStep.value = length - 1
  }
})

watch(sidebarTourSignal, async (value, oldValue) => {
  if (value === oldValue) {
    return
  }

  await startTour()
})

watch(() => user.value?.id, async (value, oldValue) => {
  if (!value || value === oldValue || showTour.value) {
    return
  }

  await loadTourStatus()
})

onMounted(async () => {
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth)
  window.addEventListener('resize', updateTourCardPosition)
  window.addEventListener('keydown', handleKeyboardShortcuts)

  if (user.value?.id) {
    await loadTourStatus()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportWidth)
  window.removeEventListener('resize', updateTourCardPosition)
  window.removeEventListener('keydown', handleKeyboardShortcuts)
})

watch(() => route.fullPath, () => {
  closeMobileDrawer()
})

watch(isMobile, mobile => {
  if (!mobile) {
    closeMobileDrawer()
  }
})
</script>

<style scoped>
.sidebar {
  background: var(--bg2);
  border-right: 1px solid var(--border);
  padding: 16px 0;
  flex-shrink: 0;
  width: 220px;
  transition: width 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.sidebar-small-desktop {
  width: 220px;
}

.sidebar-standard-desktop {
  width: 250px;
}

.sidebar-large-desktop {
  width: 272px;
}

.sidebar-collapsed {
  width: 88px;
}

.sidebar-collapsed .nav-label {
  text-align: center;
  padding-left: 8px;
  padding-right: 8px;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding-left: 12px;
  padding-right: 12px;
}

.sidebar-collapsed .user-profile-link {
  justify-content: center;
  padding-left: 12px;
  padding-right: 12px;
}

@media (max-width: 767px) {
  .sidebar {
    position: fixed !important;
    top: 0;
    left: 0;
    z-index: 90;
    width: min(86vw, 320px) !important;
    height: 100dvh;
    transform: translateX(-100%);
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  }
  .sidebar.sidebar-mobile-open {
    transform: translateX(0);
  }
}

.tour-sidebar-active {
  z-index: 95;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  padding: 0 16px 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.nav-item-shell,
.profile-shell {
  position: relative;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text2);
  border-left: 2px solid transparent;
  transition: all 0.15s;
  text-decoration: none;
}

.nav-item:hover {
  color: var(--text);
  background: var(--bg3);
}

.nav-item.active {
  color: var(--amber);
  border-left-color: var(--amber);
  background: var(--bg3);
}

.premium-badge {
  color: var(--amber);
  font-size: 10px;
  font-weight: 800;
  font-style: italic;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
  opacity: 0.8;
}

@keyframes delayedFadeIn {
  0% { opacity: 0; }
  60% { opacity: 0; }
  100% { opacity: 1; }
}

.delayed-fade-in {
  animation: delayedFadeIn 2s ease;
}

.nav-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.tour-shell-dimmed {
  opacity: 0.42;
}

.tour-shell-active {
  opacity: 1;
  transform: translateX(4px);
}

.tour-shell-active .nav-item,
.tour-shell-active .user-profile-link {
  background: linear-gradient(135deg, rgba(var(--amber-rgb), 0.14), rgba(255, 255, 255, 0.96));
  border-color: rgba(var(--amber-rgb), 0.3);
  box-shadow: 0 14px 30px rgba(var(--amber-rgb), 0.18);
}

.tour-item-active {
  position: relative;
}

.user-profile-link {
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.18s ease;
}

.mobile-menu-button {
  position: fixed;
  top: 2px;
  right: 12px;
  z-index: 92;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg2) 92%, white);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 89;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(4px);
}

.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(4px);
}

.tour-card {
  position: fixed;
  z-index: 96;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98));
  border: 1px solid rgba(var(--amber-rgb), 0.16);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.2);
}

.tour-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tour-kicker {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text3);
  font-family: var(--font-mono);
  margin-bottom: 6px;
}

.tour-title {
  font-size: 20px;
  line-height: 1.1;
  color: var(--text);
  font-family: var(--font-head);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.tour-close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  background: var(--bg2);
  color: var(--text3);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tour-close:hover {
  border-color: var(--border2);
  color: var(--text);
}

.tour-step-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.tour-step-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--amber);
  background: rgba(var(--amber-rgb), 0.12);
}

.tour-copy {
  margin: 14px 0 8px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.55;
}

.tour-tip {
  margin: 0;
  color: var(--text2);
  font-size: 12px;
  line-height: 1.55;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(var(--amber-rgb), 0.08);
}

.tour-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.tour-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--border);
  transition: all 0.18s ease;
}

.tour-dot-active {
  width: 20px;
  background: var(--amber);
}

.tour-dot-complete {
  background: color-mix(in srgb, var(--amber) 60%, white);
}

.tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.tour-link-btn {
  border: none;
  background: transparent;
  color: var(--text3);
  font-size: 12px;
  font-family: var(--font-mono);
  cursor: pointer;
  padding: 0;
}

.tour-link-btn:hover {
  color: var(--text);
}

.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}

.sidebar-overlay-enter-active,
.sidebar-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.sidebar-overlay-enter-from,
.sidebar-overlay-leave-to {
  opacity: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .tour-card {
    max-width: calc(100vw - 32px);
  }
}

@media (max-width: 767px) {
  .nav-label {
    padding-left: 20px;
    padding-right: 20px;
  }

  .nav-item {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
