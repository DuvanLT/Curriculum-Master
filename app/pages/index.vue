<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to, from) {
      return navigateTo('/landing', { replace: true })
    }
  ]
})
</script>
