<template>
  <div class="stat-card" :class="[`anim-slide-up`, `anim-delay-${delay}`]">
    <div class="stat-icon" :class="color">
      <span>{{ icon }}</span>
    </div>
    <div class="stat-content">
      <div class="stat-value">
        {{ value }}<span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
      </div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  value: { type: [Number, String], required: true },
  label: { type: String, required: true },
  color: { type: String, default: 'primary' },
  suffix: { type: String, default: '' },
  delay: { type: Number, default: 1 }
})
</script>

<style scoped>
.stat-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.primary { background: var(--color-primary-bg); }
.stat-icon.success { background: var(--color-success-bg); }
.stat-icon.warning { background: var(--color-warning-bg); }
.stat-icon.info { background: var(--color-info-bg); }

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-suffix {
  font-size: var(--font-sm);
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.stat-label {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}
</style>
