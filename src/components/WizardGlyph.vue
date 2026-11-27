<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{ kind: 'duration' | 'difficulty' | 'mode'; level?: number }>(), { level: 1 })
const id = useId()
const gold = `${id}-gold`
const energy = `${id}-energy`
const ring = `${id}-ring`
</script>

<template>
  <svg
    class="wizard-glyph"
    viewBox="0 0 180 110"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient
        :id="gold"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
      >
        <stop stop-color="#fff1b4" />
        <stop
          offset=".45"
          stop-color="#f7ca62"
        />
        <stop
          offset="1"
          stop-color="#a66625"
        />
      </linearGradient>
      <linearGradient
        :id="energy"
        x2=".7"
        y2="1"
      >
        <stop stop-color="var(--wizard-gem-light, #c3faff)" />
        <stop
          offset=".5"
          stop-color="var(--color-primary)"
        />
        <stop
          offset="1"
          stop-color="var(--wizard-gem-dark, #14748c)"
        />
      </linearGradient>
      <radialGradient :id="ring">
        <stop
          stop-color="var(--color-primary)"
          stop-opacity=".28"
        />
        <stop
          offset="1"
          stop-color="var(--color-primary)"
          stop-opacity="0"
        />
      </radialGradient>
    </defs>
    <ellipse
      cx="90"
      cy="60"
      rx="86"
      ry="48"
      :fill="`url(#${ring})`"
    />
    <ellipse
      cx="90"
      cy="89"
      rx="64"
      ry="12"
      fill="none"
      stroke="var(--color-primary)"
      stroke-opacity=".45"
    />
    <ellipse
      cx="90"
      cy="89"
      rx="39"
      ry="7"
      fill="none"
      stroke="#f7ca62"
      stroke-opacity=".7"
    />
    <g v-if="props.kind === 'duration'">
      <g
        v-for="index in props.level"
        :key="index"
        :transform="`translate(${90 + (index - (props.level + 1) / 2) * 42} 51)`"
      >
        <path
          d="M-24-30 -8-30 25 0 -8 30 -24 30 7 0Z"
          :fill="`url(#${energy})`"
          :stroke="`url(#${gold})`"
          stroke-width="2.6"
          stroke-linejoin="round"
        />
        <path
          d="m-15-24 26 24-26 24"
          fill="none"
          stroke="#fff"
          stroke-opacity=".55"
          stroke-width="1.4"
        />
      </g>
    </g>
    <g v-else>
      <g
        v-for="index in props.kind === 'mode' ? 1 : props.level"
        :key="index"
        :transform="`translate(${90 + (index - ((props.kind === 'mode' ? 1 : props.level) + 1) / 2) * 44} 50)`"
      >
        <path
          d="M0-39 20-12 20 12 0 39 -20 12 -20-12Z"
          :fill="`url(#${energy})`"
          :stroke="`url(#${gold})`"
          stroke-width="2"
        />
        <path
          d="M0-39 0 39 -20 12 -20-12Z"
          fill="#fff"
          opacity=".21"
        />
        <path
          d="M0-39 10-10 0 0-10-10Z"
          fill="#fff"
          opacity=".55"
        />
        <path
          d="m0 0 20-12v24L0 39Z"
          fill="#000"
          opacity=".15"
        />
      </g>
    </g>
  </svg>
</template>
