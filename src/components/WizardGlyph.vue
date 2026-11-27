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
    <!-- One recognisable stopwatch for all durations. The illuminated dial
         grows from a quarter to a half to a full circle; it is not a timer. -->
    <g v-if="props.kind === 'duration'">
      <path
        d="M84 12V6h12v6M119 23l5-6"
        fill="none"
        :stroke="`url(#${gold})`"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        cx="90"
        cy="50"
        r="39"
        fill="#121727"
        :stroke="`url(#${gold})`"
        stroke-width="3.2"
      />
      <circle
        cx="90"
        cy="50"
        r="34"
        :fill="`url(#${energy})`"
        fill-opacity=".1"
        stroke="var(--color-primary)"
        stroke-opacity=".22"
        stroke-width="7"
      />
      <g
        :fill="`url(#${energy})`"
        opacity=".24"
      >
        <path
          v-if="props.level === 1"
          d="M90 50V22a28 28 0 0 1 28 28Z"
        />
        <path
          v-else-if="props.level === 2"
          d="M90 50V22a28 28 0 0 1 0 56Z"
        />
        <circle
          v-else
          cx="90"
          cy="50"
          r="28"
        />
      </g>
      <circle
        cx="90"
        cy="50"
        r="34"
        fill="none"
        :stroke="`url(#${energy})`"
        stroke-width="7"
        stroke-linecap="round"
        pathLength="100"
        :stroke-dasharray="`${props.level === 1 ? 25 : props.level === 2 ? 50 : 100} 100`"
        transform="rotate(-90 90 50)"
      />
      <path
        d="M90 24v4m26 22h-4M90 76v-4M64 50h4"
        stroke="#f6deb1"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <path
        d="M77 38l13 12 18-17"
        fill="none"
        stroke="#080c1a"
        stroke-width="7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M77 38l13 12 18-17"
        fill="none"
        :stroke="`url(#${gold})`"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        cx="90"
        cy="50"
        r="3.7"
        fill="#fff2c3"
      />
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
