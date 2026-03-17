<script setup>
const { loggedIn } = useAuth()
if (!loggedIn.value) {
  navigateTo('/login')
} else {
  navigateTo('/perfil')
}
</script>
