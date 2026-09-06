/* ============================================================
   Koresh Store — مشهد 3D في الهيدر (Three.js)
   عبارة عن صندوق/منتج بيدور، بيتفاعل مع حركة الماوس ولمسة الموبايل
   ============================================================ */

function initHero3D(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === "undefined") return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0.6, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // إضاءة
  const ambient = new THREE.AmbientLight(0xf4ede1, 0.65);
  scene.add(ambient);
  const key = new THREE.PointLight(0xe3b563, 2.2, 20);
  key.position.set(3, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0x6a5cff, 1.2, 20);
  rim.position.set(-3, -2, -3);
  scene.add(rim);

  // مجموعة المنتج: صندوق مركزي + حلقات مدارية بتمثل تصنيفات المتجر
  const group = new THREE.Group();
  scene.add(group);

  const boxGeo = new THREE.IcosahedronGeometry(1.15, 0);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xc8963e,
    metalness: 0.55,
    roughness: 0.25,
    flatShading: true
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  group.add(box);

  const wireGeo = new THREE.IcosahedronGeometry(1.32, 0);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xf4ede1, wireframe: true, transparent: true, opacity: 0.35 });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  group.add(wire);

  // 3 حلقات مدارية بألوان مختلفة تمثل تنوع المنتجات
  const ringColors = [0xe3b563, 0xb5502f, 0xcfc9e0];
  const rings = [];
  ringColors.forEach((color, i) => {
    const ringGeo = new THREE.TorusGeometry(2 - i * 0.05, 0.02, 8, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + i * 0.6;
    ring.rotation.y = i * 0.4;
    scene.add(ring);
    rings.push(ring);

    // نقطة صغيرة بتدور على كل حلقة (تمثل منتج)
    const dotGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const dotMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    ring.add(dot);
    ring.userData.dot = dot;
    ring.userData.radius = 2 - i * 0.05;
    ring.userData.speed = 0.6 + i * 0.25;
  });

  let targetRotX = 0, targetRotY = 0;
  let mouseActive = false;

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    targetRotY = ((cx / rect.width) - 0.5) * 0.8;
    targetRotX = ((cy / rect.height) - 0.5) * 0.8;
    mouseActive = true;
  }
  container.addEventListener("mousemove", onPointerMove);
  container.addEventListener("touchmove", onPointerMove, { passive: true });
  container.addEventListener("mouseleave", () => { mouseActive = false; });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    group.rotation.y += (( mouseActive ? targetRotY : Math.sin(t * 0.3) * 0.3) - group.rotation.y) * 0.04;
    group.rotation.x += ((mouseActive ? targetRotX : Math.cos(t * 0.25) * 0.15) - group.rotation.x) * 0.04;
    group.rotation.y += 0.003;
    wire.rotation.y -= 0.004;

    rings.forEach(ring => {
      const angle = t * ring.userData.speed;
      ring.userData.dot.position.set(
        Math.cos(angle) * ring.userData.radius,
        0,
        Math.sin(angle) * ring.userData.radius
      );
      ring.rotation.z += 0.001;
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
