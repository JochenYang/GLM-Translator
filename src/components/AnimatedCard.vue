<template>
  <div
    ref="cardRef"
    class="animated-card"
    :class="{
      'card-hover': isHovered,
      'card-active': isActive,
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <div class="card-content">
      <slot></slot>
    </div>
    <div class="card-glow"></div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import TWEEN from "@tweenjs/tween.js";

export default {
  name: "AnimatedCard",
  props: {
    delay: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const cardRef = ref(null);
    const isHovered = ref(false);

    const handleMouseEnter = () => {
      isHovered.value = true;

      // 悬停动画
      new TWEEN.Tween({ scale: 1, y: 0 })
        .to({ scale: 1.02, y: -2 }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          if (cardRef.value) {
            cardRef.value.style.transform = `scale(${obj.scale}) translateY(${obj.y}px)`;
          }
        })
        .start();
    };

    const handleMouseLeave = () => {
      isHovered.value = false;

      // 离开动画
      new TWEEN.Tween({ scale: 1.02, y: -2 })
        .to({ scale: 1, y: 0 }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          if (cardRef.value) {
            cardRef.value.style.transform = `scale(${obj.scale}) translateY(${obj.y}px)`;
          }
        })
        .start();
    };

    const handleClick = () => {
      // 点击动画
      new TWEEN.Tween({ scale: 1 })
        .to({ scale: 0.98 }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          if (cardRef.value) {
            cardRef.value.style.transform = `scale(${obj.scale})`;
          }
        })
        .onComplete(() => {
          new TWEEN.Tween({ scale: 0.98 })
            .to({ scale: 1 }, 100)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
              if (cardRef.value) {
                cardRef.value.style.transform = `scale(${obj.scale})`;
              }
            })
            .start();
        })
        .start();

      emit("click");
    };

    const animateIn = () => {
      if (cardRef.value) {
        // 初始状态
        cardRef.value.style.opacity = "0";
        cardRef.value.style.transform = "translateY(20px)";

        // 入场动画
        setTimeout(() => {
          new TWEEN.Tween({ opacity: 0, y: 20 })
            .to({ opacity: 1, y: 0 }, 600)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate((obj) => {
              if (cardRef.value) {
                cardRef.value.style.opacity = obj.opacity;
                cardRef.value.style.transform = `translateY(${obj.y}px)`;
              }
            })
            .start();
        }, props.delay);
      }
    };

    onMounted(() => {
      animateIn();
    });

    return {
      cardRef,
      isHovered,
      handleMouseEnter,
      handleMouseLeave,
      handleClick,
    };
  },
};
</script>

<style scoped>
.animated-card {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(229, 231, 235, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
}

.animated-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-hover::before {
  opacity: 1;
}

.card-active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.card-active::before {
  opacity: 1;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(147, 51, 234, 0.15) 100%
  );
}

.card-content {
  position: relative;
  z-index: 2;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(59, 130, 246, 0.1) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.card-hover .card-glow {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animated-card {
    border-radius: 8px;
  }
}
</style>
