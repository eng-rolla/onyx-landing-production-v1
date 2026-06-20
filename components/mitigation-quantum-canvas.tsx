"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MitigationQuantumCanvasProps = {
  className?: string;
  activeLayer?: number;
};

type DefenseShell = THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

function getPerformanceProfile() {
  return {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    widthSegments: 72,
    heightSegments: 36,
    animationIntensity: 1,
    animationSpeed: 1,
  };
}

function createDefenseSpheres(widthSegments: number, heightSegments: number) {
  const group = new THREE.Group();
  const shells: DefenseShell[] = [];
  const layers = [
    { radius: 0.82, color: "#e0fcff", dim: 0.05, lit: 0.46, speed: 0.1 },
    { radius: 1.18, color: "#22d3ee", dim: 0.04, lit: 0.34, speed: -0.075 },
    { radius: 1.56, color: "#2dd4bf", dim: 0.03, lit: 0.27, speed: 0.052 },
  ];

  layers.forEach((layer, index) => {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(layer.radius, widthSegments, heightSegments),
      new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.dim,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    shell.rotation.x = 1.08 + index * 0.12;
    shell.rotation.y = index * 0.36;
    shell.rotation.z = -0.08 - index * 0.06;
    shell.userData = {
      dimOpacity: layer.dim,
      litOpacity: layer.lit,
      currentOpacity: layer.dim,
      phase: index * 1.15,
      speed: layer.speed,
    };

    shells.push(shell);
    group.add(shell);
  });

  return { group, shells };
}

export function MitigationQuantumCanvas({ className, activeLayer = 0 }: MitigationQuantumCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const activeLayerRef = useRef(activeLayer);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const profile = getPerformanceProfile();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(profile.pixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const defense = createDefenseSpheres(profile.widthSegments, profile.heightSegments);
    defense.group.position.x = 0.38;
    defense.group.rotation.x = 0.08;
    scene.add(defense.group);

    let frame = 0;
    let resizeFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 0;
    let elapsedTime = 0;
    let sectionVisible = true;
    let pageVisible = !document.hidden;
    let cleanedUp = false;
    const clock = new THREE.Clock();

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const nextWidth = Math.max(Math.round(rect.width), 1);
      const nextHeight = Math.max(Math.round(rect.height), 1);
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (nextWidth === width && nextHeight === height && nextPixelRatio === pixelRatio) return;

      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextPixelRatio;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const requestResize = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    };

    const resizeObserver = new ResizeObserver(requestResize);
    resizeObserver.observe(mount);
    resize();

    const shouldRender = () => !cleanedUp && sectionVisible && pageVisible;

    const stopRender = () => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const startRender = () => {
      if (frame || !shouldRender()) return;
      clock.getDelta();
      frame = window.requestAnimationFrame(render);
    };

    const render = () => {
      frame = 0;
      if (!shouldRender()) return;

      elapsedTime += Math.min(clock.getDelta(), 0.033) * profile.animationSpeed;
      const time = elapsedTime;

      const activeIndex = activeLayerRef.current;
      defense.shells.forEach((shell, index) => {
        const pulse = 1 + Math.sin(time * 0.62 + shell.userData.phase) * 0.012 * profile.animationIntensity;
        shell.rotation.x += (0.0005 + index * 0.00012) * profile.animationIntensity;
        shell.rotation.y += shell.userData.speed * 0.006 * profile.animationIntensity;
        shell.rotation.z += (0.00032 + index * 0.0001) * profile.animationIntensity;
        shell.scale.setScalar(pulse);

        const isActive = index === activeIndex;
        const target = isActive ? shell.userData.litOpacity : shell.userData.dimOpacity;
        shell.userData.currentOpacity += (target - shell.userData.currentOpacity) * 0.06;
        const flicker = isActive ? 0.82 + Math.sin(time * 0.7 + shell.userData.phase) * 0.18 * profile.animationIntensity : 1;
        shell.material.opacity = shell.userData.currentOpacity * flicker;
      });

      defense.group.rotation.y = Math.sin(time * 0.12) * 0.08 * profile.animationIntensity;
      renderer.render(scene, camera);

      if (shouldRender()) {
        frame = window.requestAnimationFrame(render);
      }
    };

    // Off-screen pausing: stop requestAnimationFrame when the sphere section is
    // outside/near outside the viewport, and resume with the clock delta reset.
    const visibilityObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              if (!entry) return;
              sectionVisible = entry.isIntersecting;
              if (sectionVisible) {
                resize();
                startRender();
              } else {
                stopRender();
              }
            },
            { rootMargin: "320px 0px", threshold: 0 },
          )
        : null;

    visibilityObserver?.observe(mount);

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        startRender();
      } else {
        stopRender();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startRender();

    return () => {
      cleanedUp = true;
      stopRender();
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
      defense.group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      renderer.renderLists.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={className}>
      <div ref={mountRef} className="mitigation-quantum__canvas" />
      <div className="mitigation-quantum__callouts" aria-hidden="true">
        <span className="mitigation-quantum__callout mitigation-quantum__callout--algorithm">
          <span className="mitigation-quantum__line" />
          <span className="mitigation-quantum__label">Code simulation</span>
        </span>
        <span className="mitigation-quantum__callout mitigation-quantum__callout--crack-time">
          <span className="mitigation-quantum__line" />
          <span className="mitigation-quantum__label">Defense-in-depth layers</span>
        </span>
        <span className="mitigation-quantum__callout mitigation-quantum__callout--migration">
          <span className="mitigation-quantum__line" />
          <span className="mitigation-quantum__label">Quantum attack resistance</span>
        </span>
      </div>
    </div>
  );
}
