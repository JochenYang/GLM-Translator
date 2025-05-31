<template>
  <div ref="particleContainer" class="particle-background"></div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

export default {
  name: "ParticleBackground",
  setup() {
    const particleContainer = ref(null);
    let scene, camera, renderer, particles;
    let animationId;

    const initThreeJS = () => {
      // 创建场景
      scene = new THREE.Scene();

      // 创建相机
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      // 创建渲染器
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      particleContainer.value.appendChild(renderer.domElement);

      // 创建粒子系统
      createParticles();

      // 开始动画循环
      animate();
    };

    const createParticles = () => {
      const particleCount = 100;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // 位置
        positions[i3] = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = (Math.random() - 0.5) * 20;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;

        // 颜色 (蓝色系)
        colors[i3] = 0.2 + Math.random() * 0.3; // R
        colors[i3 + 1] = 0.4 + Math.random() * 0.4; // G
        colors[i3 + 2] = 0.8 + Math.random() * 0.2; // B

        // 大小
        sizes[i] = Math.random() * 3 + 1;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      // 创建材质
      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // 更新TWEEN
      TWEEN.update();

      // 旋转粒子系统
      if (particles) {
        particles.rotation.x += 0.001;
        particles.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    onMounted(() => {
      initThreeJS();
      window.addEventListener("resize", handleResize);
    });

    onUnmounted(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", handleResize);
      if (renderer) {
        renderer.dispose();
      }
    });

    return {
      particleContainer,
    };
  },
};
</script>

<style scoped>
.particle-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.particle-background canvas {
  display: block;
}
</style>
