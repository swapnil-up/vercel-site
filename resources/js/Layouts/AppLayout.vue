<script setup>
import Navbar from '@/Components/Navbar.vue';
</script>

<template>
    <div class="min-h-screen bg-gray-100">
        <Navbar />
        <main class="container mx-auto p-6">
            <slot />
        </main>
    </div>
</template>
