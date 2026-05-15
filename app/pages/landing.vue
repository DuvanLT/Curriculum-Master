<template>
  <div class="landing-page min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
    <nav class="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/landing" class="flex items-center gap-3">
          <!-- <div class="flex h-10 w-10 rotate-6 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
           <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>-->
          <span class="text-2xl font-bold tracking-tight text-slate-900">
            Bring<span class="text-indigo-600">Jobs</span>
          </span>
        </NuxtLink>

        <div class="hidden items-center gap-8 text-sm font-semibold italic text-slate-700 md:flex">
          <a href="#features" class="transition hover:text-indigo-600">{{ t('landing.nav_features') }}</a>
          <a href="#how-it-works" class="transition hover:text-indigo-600">{{ t('landing.nav_how_it_works') }}</a>
          <a href="#pricing" class="transition hover:text-indigo-600">{{ t('landing.nav_pricing') }}</a>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <select
              class="appearance-none bg-transparent pl-3 pr-6 py-2 text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition"
              :value="locale"
              @change="(e) => changeLanguage((e.target as HTMLSelectElement).value)"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-500">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <NuxtLink
            to="/login"
            class="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:inline-flex"
          >
            {{ t('landing.nav_login') }}
          </NuxtLink>
          <NuxtLink
            :to="primaryCta"
            class="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-500"
          >
            {{ t('landing.nav_cta') }}
          </NuxtLink>
        </div>
      </div>
    </nav>

    <section class="landing-hero relative overflow-hidden pb-24 pt-32 lg:pb-32 lg:pt-44">
      <div class="landing-orb landing-orb-right" />
      <div class="landing-orb landing-orb-left" />

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <p class="mb-5 inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.32em] text-indigo-700 shadow-sm">
            {{ t('landing.hero_kicker') }}
          </p>
          <h1 class="mx-auto mb-6 max-w-5xl text-5xl font-black leading-tight tracking-[-0.04em] text-slate-950 lg:text-7xl">
            {{ t('landing.hero_title') }}
          </h1>
          <p class="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-600 lg:text-xl">
            {{ t('landing.hero_subtitle') }}
          </p>

          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink
              :to="primaryCta"
              class="rounded-3xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-indigo-500/25 transition hover:-translate-y-1 hover:bg-indigo-500"
            >
              {{ t('landing.hero_cta') }}
            </NuxtLink>
            <a
              href="#how-it-works"
              class="rounded-3xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-800 transition hover:-translate-y-1 hover:bg-slate-50"
            >
              {{ t('landing.hero_secondary_cta') }}
            </a>
          </div>

          <div class="relative mt-16">
            <div class="absolute inset-0 flex items-center justify-center opacity-30">
              <div class="h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
            </div>
            <div class="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_35px_120px_rgba(79,70,229,0.25)]">
              <img
                src="/mockup.svg"
                alt="Dashboard de BringJobs"
                class="w-full scale-105 object-cover transition duration-500 hover:scale-[1.08]"
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" class="bg-white py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-4xl font-black italic tracking-[-0.03em] text-slate-950 lg:text-6xl">
            {{ t('landing.features_kicker') }}
            <span class="text-indigo-600">{{ t('landing.features_kicker') }}</span>
          </h2>
          <p class="text-lg text-slate-500">
            {{ t('landing.features_subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-6 md:auto-rows-[300px] md:grid-cols-4 md:grid-rows-3">
          <article class="group relative overflow-hidden rounded-[2.5rem] bg-indigo-600 shadow-2xl transition duration-500 hover:scale-[1.02] md:col-span-2 md:row-span-2">
            <div class="absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div class="relative z-10 flex h-full flex-col justify-between p-8 text-white">
              <div>
                <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 class="mb-4 text-3xl font-bold italic">{{ t('landing.feat_ats_title') }}</h3>
                <p class="max-w-sm text-lg text-indigo-100">
                  {{ t('landing.feat_ats_desc') }}
                </p>
              </div>
              <div class="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider">{{ t('landing.feat_ats_comp') }}</span>
                  <span class="text-2xl font-black italic">94%</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div class="h-full w-[94%] rounded-full bg-white" />
                </div>
              </div>
            </div>
          </article>

          <article class="relative overflow-hidden rounded-[2.5rem] bg-sky-500 shadow-xl transition duration-500 hover:scale-[1.02] md:col-span-2">
            <div class="relative z-10 flex h-full items-center gap-6 p-8 text-white">
              <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 class="mb-2 text-xl font-bold italic">{{ t('landing.feat_import_title') }}</h3>
                <p class="text-sm italic text-sky-100">
                  {{ t('landing.feat_import_desc') }}
                </p>
              </div>
            </div>
          </article>

          <article class="relative overflow-hidden rounded-[2.5rem] bg-slate-950 shadow-xl transition duration-500 hover:scale-[1.02] md:row-span-2">
            <div class="relative z-10 flex h-full flex-col justify-between p-8 text-white">
              <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 class="mb-4 text-xl font-bold italic">{{ t('landing.feat_coach_title') }}</h3>
                <p class="text-sm text-slate-400">
                  {{ t('landing.feat_coach_desc') }}
                </p>
              </div>
              <div class="mt-6 flex -space-x-2">
                <div class="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-400" />
                <div class="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-500" />
                <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-indigo-600 text-[10px] font-bold">+1k</div>
              </div>
            </div>
          </article>

          <article class="relative overflow-hidden rounded-[2.5rem] bg-emerald-500 shadow-xl transition duration-500 hover:scale-[1.02]">
            <div class="relative z-10 flex h-full flex-col justify-center p-8 text-white">
              <h3 class="mb-2 text-xl font-bold italic">{{ t('landing.feat_sim_title') }}</h3>
              <p class="text-xs italic text-emerald-100">{{ t('landing.feat_sim_desc') }}</p>
              <div class="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-bold">
                <span class="h-2 w-2 rounded-full bg-white animate-ping" />
                <span>{{ t('landing.feat_sim_live') }}</span>
              </div>
            </div>
          </article>

          <article class="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-100 shadow-xl transition duration-500 hover:scale-[1.02] md:col-span-2">
            <div class="relative z-10 flex h-full items-center justify-between gap-6 p-8">
              <div class="max-w-[60%]">
                <h3 class="mb-2 text-xl font-bold italic text-slate-900">{{ t('landing.feat_manager_title') }}</h3>
                <p class="text-sm italic text-slate-500">
                  {{ t('landing.feat_manager_desc') }}
                </p>
              </div>
              <div class="flex gap-2">
                <div class="h-10 w-10 rounded-lg bg-emerald-100" />
                <div class="h-10 w-10 rounded-lg bg-sky-100" />
                <div class="h-10 w-10 rounded-lg bg-orange-100" />
              </div>
            </div>
          </article>

          <article class="relative overflow-hidden rounded-[2.5rem] bg-fuchsia-600 shadow-xl transition duration-500 hover:scale-[1.02]">
            <div class="relative z-10 flex h-full flex-col items-center justify-center p-8 text-center text-white">
              <svg class="mb-2 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <h3 class="text-lg font-bold italic">{{ t('landing.feat_generator') }}</h3>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="overflow-hidden bg-slate-50 py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-20 text-center">
          <h2 class="mb-4 text-4xl font-black italic tracking-[-0.03em] text-slate-950 lg:text-5xl">
            {{ t('landing.how_title_prefix') }}
            <span class="text-indigo-600">{{ t('landing.how_title_emphasis') }}</span>
          </h2>
          <p class="text-lg text-slate-500">{{ t('landing.how_subtitle') }}</p>
        </div>

        <div class="relative">
          <div class="absolute left-1/2 hidden h-full w-1 -translate-x-1/2 bg-indigo-600/10 lg:block" />

          <div class="space-y-24">
            <div class="relative flex flex-col items-center lg:flex-row">
              <div class="mb-8 text-center lg:mb-0 lg:w-1/2 lg:pr-16 lg:text-right">
                <span class="mb-2 block text-6xl font-black text-indigo-600/20">01</span>
                <h3 class="mb-4 text-3xl font-bold italic">{{ t('landing.how_step1_title') }}</h3>
                <p class="text-lg text-slate-600">
                  {{ t('landing.how_step1_desc') }}
                </p>
              </div>
              <div class="absolute left-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white shadow-lg lg:flex">1</div>
              <div class="lg:w-1/2 lg:pl-16">
                <div class="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl transition duration-500 hover:rotate-2">
                  <div class="mb-4 flex items-center gap-4">
                    <div class="h-12 w-12 animate-pulse rounded-lg bg-slate-100" />
                    <div class="flex-1 space-y-2">
                      <div class="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div class="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                  <div class="space-y-3">
                    <div class="h-2 w-full rounded bg-indigo-200" />
                    <div class="h-2 w-5/6 rounded bg-indigo-300" />
                  </div>
                </div>
              </div>
            </div>

            <div class="relative flex flex-col items-center lg:flex-row-reverse">
              <div class="mb-8 text-center lg:mb-0 lg:w-1/2 lg:pl-16 lg:text-left">
                <span class="mb-2 block text-6xl font-black text-indigo-600/20">02</span>
                <h3 class="mb-4 text-right text-3xl font-bold italic">{{ t('landing.how_step2_title') }}</h3>
                <p class="text-right text-lg text-slate-600">
                  {{ t('landing.how_step2_desc') }}
                </p>
              </div>
              <div class="absolute left-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white shadow-lg lg:flex">2</div>
              <div class="lg:w-1/2 lg:pr-16">
                <div class="rounded-[2rem] bg-indigo-600 p-8 text-white shadow-2xl transition duration-500 hover:-rotate-2">
                  <div class="mb-6 flex items-end justify-between">
                    <div>
                      <p class="text-sm text-indigo-200">{{ t('landing.how_step2_score') }}</p>
                      <p class="text-4xl font-bold">87/100</p>
                    </div>
                    <span class="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">+12 pts</span>
                  </div>
                  <div class="space-y-2">
                    <div class="mb-1 flex justify-between text-xs">
                      <span>{{ t('landing.how_step2_relevance') }}</span>
                      <span>92%</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-white/20">
                      <div class="h-full w-[92%] rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="relative flex flex-col items-center lg:flex-row">
              <div class="mb-8 text-center lg:mb-0 lg:w-1/2 lg:pr-16 lg:text-right">
                <span class="mb-2 block text-6xl font-black text-indigo-600/20">03</span>
                <h3 class="mb-4 text-3xl font-bold italic">{{ t('landing.how_step3_title') }}</h3>
                <p class="text-lg text-slate-600">
                  {{ t('landing.how_step3_desc') }}
                </p>
              </div>
              <div class="absolute left-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white shadow-lg lg:flex">3</div>
              <div class="lg:w-1/2 lg:pl-16">
                <div class="flex items-start gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl">
                  <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <div class="rounded-2xl bg-slate-50 p-4 text-sm italic text-slate-700">
                    {{ t('landing.how_step3_quote') }}
                  </div>
                </div>
              </div>
            </div>

            <div class="relative flex flex-col items-center lg:flex-row-reverse">
              <div class="mb-8 text-center lg:mb-0 lg:w-1/2 lg:pl-16 lg:text-left">
                <span class="mb-2 block text-6xl font-black text-indigo-600/20">04</span>
                <h3 class="mb-4 text-right text-3xl font-bold italic">{{ t('landing.how_step4_title') }}</h3>
                <p class="text-right text-lg text-slate-600">
                  {{ t('landing.how_step4_desc') }}
                </p>
              </div>
              <div class="absolute left-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white shadow-lg lg:flex">4</div>
              <div class="lg:w-1/2 lg:pr-16">
                <div class="grid grid-cols-2 gap-4">
                  <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p class="mb-1 text-xs font-bold uppercase text-emerald-700">{{ t('landing.how_step4_interview') }}</p>
                    <p class="text-sm font-bold italic text-emerald-950">Google Cloud</p>
                  </div>
                  <div class="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                    <p class="mb-1 text-xs font-bold uppercase text-orange-700">{{ t('landing.how_step4_pending') }}</p>
                    <p class="text-sm font-bold italic text-orange-900">Bancolombia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!--
    <section id="stats" class="bg-slate-900 py-20 text-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 text-center uppercase lg:grid-cols-4">
          <div>
            <p class="mb-2 text-4xl font-black italic text-indigo-400 lg:text-5xl">150k+</p>
            <p class="text-sm tracking-[0.28em] text-slate-400">{{ t('landing.stats_cvs') }}</p>
          </div>
          <div>
            <p class="mb-2 text-4xl font-black italic text-indigo-400 lg:text-5xl">85%</p>
            <p class="text-sm tracking-[0.28em] text-slate-400">{{ t('landing.stats_rate') }}</p>
          </div>
          <div>
            <p class="mb-2 text-4xl font-black italic text-indigo-400 lg:text-5xl">2.4x</p>
            <p class="text-sm tracking-[0.28em] text-slate-400">{{ t('landing.stats_salary') }}</p>
          </div>
          <div>
            <p class="mb-2 text-4xl font-black italic text-indigo-400 lg:text-5xl">12+</p>
            <p class="text-sm tracking-[0.28em] text-slate-400">{{ t('landing.stats_countries') }}</p>
          </div>
        </div>
      </div>
    </section>
 -->
    <!-- SECCIÓN DE PRICING -->
    <section id="pricing" class="relative overflow-hidden bg-white py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-4xl font-black italic tracking-[-0.03em] text-slate-950 lg:text-5xl">
            {{ t('landing.pricing_title_prefix') }}
            <span class="text-indigo-600">{{ t('landing.pricing_title_emphasis') }}</span>
          </h2>
          <p class="text-lg text-slate-500">{{ t('landing.pricing_subtitle') }}</p>
        </div>

        <div class="mx-auto max-w-lg">
          <!-- Pricing Card -->
          <div class="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_20px_80px_rgba(79,70,229,0.15)] ring-1 ring-slate-100 transition duration-500 hover:scale-[1.02] sm:p-10">
            
            <!-- Etiqueta superior -->
            <div class="absolute right-0 top-0 rounded-bl-3xl rounded-tr-[2.5rem] bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-md">
              {{ t('landing.pricing_badge') }}
            </div>

            <!-- Fondo decorativo sutil -->
            <div class="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-50 blur-3xl transition duration-500 group-hover:bg-indigo-100" />

            <div class="relative z-10">
              <div class="mb-8">
                <h3 class="text-2xl font-black italic text-slate-900">{{ t('landing.pricing_plan') }}</h3>              </div>

              <!-- Precio -->
              <div class="mb-8 flex items-baseline gap-3">
                <span class="text-6xl font-black tracking-tight text-slate-900">$8.99</span>
                <span class="text-xl font-bold text-slate-300 line-through decoration-2">$14.99</span>
                <span class="text-sm font-bold text-slate-400">USD</span>
              </div>

              <!-- Lista de beneficios (Lo que evalúa la pasarela) -->
              <ul class="mb-10 space-y-5">
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit1') }}</strong> {{ t('landing.pricing_benefit1_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit2') }}</strong> {{ t('landing.pricing_benefit2_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit3') }}</strong> {{ t('landing.pricing_benefit3_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit4') }}</strong> {{ t('landing.pricing_benefit4_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit5') }}</strong> {{ t('landing.pricing_benefit5_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit6') }}</strong> {{ t('landing.pricing_benefit6_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit7') }}</strong> {{ t('landing.pricing_benefit7_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit8') }}</strong> {{ t('landing.pricing_benefit8_desc') }}</span>
                </li>
                <li class="flex items-start gap-4">
                  <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit9') }}</strong> {{ t('landing.pricing_benefit9_desc') }}</span>
                </li>
              </ul>

              <!-- Botón de Pago -->
              <NuxtLink
                :to="primaryCta"
                class="block w-full rounded-3xl bg-indigo-600 px-8 py-4 text-center text-lg font-bold text-white shadow-xl shadow-indigo-500/25 transition hover:-translate-y-1 hover:bg-indigo-500"
              >
                {{ t('landing.pricing_cta') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="relative overflow-hidden bg-white py-24">
      <div class="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div class="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div class="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-[3rem] bg-indigo-600 p-12 text-center shadow-[0_35px_120px_rgba(79,70,229,0.3)] transition duration-500 hover:scale-[1.02] lg:p-20">
          <h2 class="mb-8 text-4xl font-black italic text-white lg:text-6xl">
            {{ t('landing.cta_title') }}
          </h2>
          <p class="mx-auto mb-12 max-w-xl text-xl text-indigo-100">
            {{ t('landing.cta_subtitle') }}
          </p>
          <NuxtLink
            :to="primaryCta"
            class="inline-flex rounded-3xl bg-white px-10 py-5 text-xl font-black italic text-indigo-600 shadow-xl transition hover:bg-slate-100"
          >
           Probar Gratis
          </NuxtLink>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-100 bg-slate-50 pb-10 pt-20 italic">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 grid grid-cols-2 gap-12 lg:grid-cols-4">
          <div class="col-span-2">
            <div class="mb-6 flex items-center gap-2">
              <!-- <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>-->
              <div class="text-2xl font-black not-italic text-slate-900 flex flex-row">
            <img src="https://www.qaliby.com/assets/qali-logo.webp" alt="" class="w-8 h-8 mr-2">Qaliby x Bring<span class="text-indigo-600">Jobs</span> </div>
            </div>
            <p class="max-w-xs leading-relaxed text-slate-500 not-italic">
              {{ t('landing.footer_desc') }}
            </p>
            
          </div>

          <div>
            <h4 class="mb-6 font-bold text-slate-900">{{ t('landing.footer_product') }}</h4>
            <ul class="space-y-4 text-slate-500 not-italic">
              <li><NuxtLink to="/signup" class="transition hover:text-indigo-600">{{ t('landing.footer_create') }}</NuxtLink></li>
              <li><NuxtLink to="/login" class="transition hover:text-indigo-600">{{ t('landing.footer_login') }}</NuxtLink></li>
              <li><a href="#features" class="transition hover:text-indigo-600"><NuxtLink to="#features" class="transition hover:text-indigo-600">{{ t('landing.nav_features') }}</NuxtLink></a></li>
            </ul>
          </div>

          <div>
            <h4 class="mb-6 font-bold text-slate-900">{{ t('landing.footer_resources') }}</h4>
            <ul class="space-y-4 text-slate-500 not-italic">
              <li><a href="#how-it-works" class="transition hover:text-indigo-600"><NuxtLink to="#how-it-works" class="transition hover:text-indigo-600">{{ t('landing.nav_how_it_works') }}</NuxtLink></a></li>
              <li><a href="#" class="transition hover:text-indigo-600">{{ t('landing.footer_terms') }}</a></li>
            </ul>
          </div>
        </div>

        <div class="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-400 md:flex-row">
          <p>© 2026 BringJobs. {{ t('landing.footer_rights') }}</p>
          <div class="flex gap-6">
            <a href="https://www.facebook.com/share/17YdtVDqJA/?mibextid=wwXIfr" class="transition hover:text-indigo-600">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const { loggedIn } = useAuth()
const { t, setLocale, locale } = useI18n()

const changeLanguage = (lang: string) => {
  setLocale(lang as 'es' | 'en')
}

const primaryCta = computed(() => loggedIn.value ? '/dashboard' : '/signup')

useSeoMeta({
  title: () => t('seo.landing.title'),
  description: () => t('seo.landing.description'),
  ogTitle: () => t('seo.landing.title'),
  ogDescription: () => t('seo.landing.description'),
  ogImage: 'https://bringjobs.qaliby.com/og-image.png',
  ogUrl: 'https://bringjobs.qaliby.com/landing',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.landing.title'),
  twitterDescription: () => t('seo.landing.description'),
  twitterImage: 'https://bringjobs.qaliby.com/og-image.png',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://bringjobs.qaliby.com/landing' }
  ]
})
</script>

<style scoped>
.landing-page {
  font-family: "Outfit", sans-serif;
}

.landing-hero {
  background:
    radial-gradient(circle at top right, rgba(79, 70, 229, 0.14), transparent 34%),
    radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.12), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.landing-gradient-text {
  background: linear-gradient(90deg, #4f46e5, #818cf8, #3b82f6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.landing-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.7;
  pointer-events: none;
}

.landing-orb-right {
  width: 24rem;
  height: 24rem;
  right: -8rem;
  top: 2rem;
  background: rgba(99, 102, 241, 0.18);
}

.landing-orb-left {
  width: 20rem;
  height: 20rem;
  left: -6rem;
  bottom: 0;
  background: rgba(59, 130, 246, 0.12);
}
</style>
