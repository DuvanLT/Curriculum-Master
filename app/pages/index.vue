<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to, from) {
      return navigateTo('/login', { replace: true })
    }
  ]
})
</script>
