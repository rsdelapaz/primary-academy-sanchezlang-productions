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
    <!-- Difficulty is a climb: a gentle hill, a rocky ascent, a high summit.
         The silhouettes and summit heights communicate the challenge without
         relying on colour or implying a time limit. -->
    <g v-else-if="props.kind === 'difficulty'">
      <g
        v-if="props.level === 1"
        class="difficulty-hill"
      >
        <path
          d="M18 84Q38 79 55 64Q70 51 90 51Q111 51 128 68L162 84Z"
          :fill="`url(#${energy})`"
          :stroke="`url(#${gold})`"
          stroke-width="2.5"
          stroke-linejoin="round"
        />
        <path
          d="M18 84Q38 79 55 64Q70 51 90 51Q79 61 74 71L65 84Z"
          fill="#fff"
          opacity=".25"
        />
        <path
          d="M43 82Q72 75 90 53"
          fill="none"
          stroke="#ffedb1"
          stroke-width="3"
          stroke-linecap="round"
        />
      </g>
      <g v-else-if="props.level === 2">
        <path
          d="M18 84L48 59L62 67L91 36L119 65L137 57L162 84Z"
          :fill="`url(#${energy})`"
          :stroke="`url(#${gold})`"
          stroke-width="2.5"
          stroke-linejoin="round"
        />
        <path
          d="M62 67L91 36L80 64L89 70L75 84H48Z"
          fill="#fff"
          opacity=".25"
        />
        <path
          d="M91 36L119 65L137 57L162 84H121L100 65Z"
          fill="#061426"
          opacity=".24"
        />
        <path
          d="M40 82L77 72L65 66L91 38"
          fill="none"
          stroke="#ffedb1"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <g v-else>
        <path
          d="M17 84L40 58L52 64L90 19L117 52L131 43L163 84Z"
          :fill="`url(#${energy})`"
          :stroke="`url(#${gold})`"
          stroke-width="2.5"
          stroke-linejoin="round"
        />
        <path
          d="M52 64L90 19L74 51L88 56L73 84H39Z"
          fill="#fff"
          opacity=".28"
        />
        <path
          d="M90 19L117 52L131 43L163 84H113L104 65L90 49Z"
          fill="#061426"
          opacity=".26"
        />
        <path
          d="M76 36L90 19L104 36L95 31L88 39L83 32Z"
          fill="#fff6d5"
          opacity=".92"
        />
        <path
          d="M37 82L83 72L62 64L98 53L80 45L90 22"
          fill="none"
          stroke="#ffedb1"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <g :transform="`translate(${props.level === 2 ? 91 : 90} ${props.level === 1 ? 51 : props.level === 2 ? 36 : 19})`">
        <path
          d="M0 0V-17"
          fill="none"
          stroke="#fff2b4"
          stroke-width="2.8"
          stroke-linecap="round"
        />
        <path
          d="M0-17H20L15-11L20-5H0Z"
          :fill="`url(#${gold})`"
          stroke="#fff3ca"
          stroke-width="1"
          stroke-linejoin="round"
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
