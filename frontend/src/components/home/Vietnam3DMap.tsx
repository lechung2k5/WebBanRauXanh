'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ProvinceRecord {
  id: string;
  name: string;
  type: string;
  polygons: Array<Array<[number, number]>>;
}

interface ProvincesDataset {
  provinces: ProvinceRecord[];
}

const AGRI_HUBS = [
  { name: 'Sơn La', lon: 103.91, lat: 21.32, alignLeft: true },
  { name: 'Hà Nội Hub', lon: 105.85, lat: 21.02, alignLeft: false },
  { name: 'Đà Lạt GAP', lon: 108.44, lat: 11.94, alignLeft: false },
  { name: 'Đồng Nai', lon: 107.01, lat: 10.95, alignLeft: false },
  { name: 'TP.HCM Hub', lon: 106.66, lat: 10.77, alignLeft: true },
  { name: 'Cần Thơ', lon: 105.78, lat: 10.04, alignLeft: true },
];

const HIGHLIGHT_PROVINCES = new Set([
  'Lâm Đồng',
  'Sơn La',
  'Hà Nội',
  'Thành phố Hồ Chí Minh',
  'Hồ Chí Minh',
  'Đồng Nai',
  'Cần Thơ',
  'Đắk Lắk',
  'Đà Nẵng',
]);

export const Vietnam3DMap: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<{
    name: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);
  const [hubScreenCoords, setHubScreenCoords] = useState<
    Array<{ name: string; x: number; y: number; alignLeft: boolean }>
  >([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;
    let isInViewport = true;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 150);
    camera.position.set(1.5, -10.5, 22.5);
    camera.lookAt(0.8, 0.2, 0);

    // Tắt shadowMap & giới hạn pixelRatio <= 1.5 để chạy cực mượt trên mọi máy
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xd1fae5, 1.25);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.65);
    dirLight.position.set(10, -12, 22);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x8bc34a, 0.85);
    rimLight.position.set(-14, 14, 10);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(28, 20, 0x2e7d32, 0x134e2a);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -0.18;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    scene.add(gridHelper);

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    const provinceMeshes: THREE.Mesh[] = [];
    const photonList: Array<{ curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; offset: number }> = [];
    const beaconRings: THREE.Mesh[] = [];
    const hubVectorsWithMeta: Array<{ name: string; vec: THREE.Vector3; alignLeft: boolean }> = [];

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-99, -99);
    let activeMesh: THREE.Mesh | null = null;
    let lastRaycastTime = 0;

    // Dùng chung Material với bảng màu xanh lá ban đầu của HONA FRESH
    const normalMat = new THREE.MeshStandardMaterial({
      color: 0x175c35,
      roughness: 0.45,
      metalness: 0.14,
    });
    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      roughness: 0.4,
      metalness: 0.18,
    });
    const hoverMat = new THREE.MeshStandardMaterial({
      color: 0x8bc34a,
      roughness: 0.35,
      metalness: 0.2,
    });

    const normalLineMat = new THREE.LineBasicMaterial({
      color: 0x66bb6a,
      transparent: true,
      opacity: 0.42,
    });
    const highlightLineMat = new THREE.LineBasicMaterial({
      color: 0xb2ff59,
      transparent: true,
      opacity: 0.85,
    });

    const projectGeo = (
      lon: number,
      lat: number,
      centerLon: number,
      centerLat: number,
      scale: number,
    ) => {
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      return {
        x: (lon - centerLon) * cosLat * scale,
        y: (lat - centerLat) * scale,
      };
    };

    const updateHubScreenCoords = () => {
      if (!container) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 520;
      camera.updateMatrixWorld();
      const coords = hubVectorsWithMeta.map((item) => {
        const projected = item.vec.clone().project(camera);
        return {
          name: item.name,
          x: ((projected.x + 1) / 2) * w,
          y: ((-projected.y + 1) / 2) * h,
          alignLeft: item.alignLeft,
        };
      });
      setHubScreenCoords(coords);
    };

    const loadMap = async () => {
      try {
        const res = await fetch('/data/vietnam-provinces.json');
        if (!res.ok || disposed) return;
        const data = (await res.json()) as ProvincesDataset;
        if (disposed) return;

        const centerLon = 107.6;
        const centerLat = 15.6;
        const scale = 1.18;

        // Gộp tất cả polygons của mỗi tỉnh vào 1 ExtrudeGeometry duy nhất (giảm ~90% số Mesh)
        for (const prov of data.provinces) {
          const isHighlight = HIGHLIGHT_PROVINCES.has(prov.name);
          const extrudeDepth = isHighlight ? 0.52 : 0.34;
          const shapes: THREE.Shape[] = [];

          for (const poly of prov.polygons) {
            if (!poly || poly.length < 3) continue;

            // Bỏ qua các đảo siêu nhỏ không nhìn thấy (< 0.035 độ) để giảm số đỉnh GPU
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            for (const [lon, lat] of poly) {
              if (lon < minX) minX = lon;
              if (lon > maxX) maxX = lon;
              if (lat < minY) minY = lat;
              if (lat > maxY) maxY = lat;
            }
            const isIslandTerritory = minX > 110.5; // Giữ toàn bộ Hoàng Sa, Trường Sa
            if (!isIslandTerritory && maxX - minX < 0.035 && maxY - minY < 0.035) {
              continue;
            }

            const shape = new THREE.Shape();
            poly.forEach(([lon, lat], idx) => {
              const { x, y } = projectGeo(lon, lat, centerLon, centerLat, scale);
              if (idx === 0) shape.moveTo(x, y);
              else shape.lineTo(x, y);
            });
            shape.closePath();
            shapes.push(shape);

            const borderPts = poly.map(([lon, lat]) => {
              const { x, y } = projectGeo(lon, lat, centerLon, centerLat, scale);
              return new THREE.Vector3(x, y, extrudeDepth + 0.02);
            });
            const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPts);
            mapGroup.add(
              new THREE.LineLoop(borderGeom, isHighlight ? highlightLineMat : normalLineMat),
            );
          }

          if (shapes.length === 0) continue;

          // Tắt bevel để giảm 75% số tam giác thừa
          const geom = new THREE.ExtrudeGeometry(shapes, {
            depth: extrudeDepth,
            bevelEnabled: false,
            curveSegments: 1,
          });

          const mesh = new THREE.Mesh(geom, isHighlight ? highlightMat : normalMat);
          mesh.userData = {
            name: prov.name,
            type: prov.type,
            defaultMat: isHighlight ? highlightMat : normalMat,
          };
          mapGroup.add(mesh);
          provinceMeshes.push(mesh);
        }

        const hubVectors = AGRI_HUBS.map((h) => {
          const { x, y } = projectGeo(h.lon, h.lat, centerLon, centerLat, scale);
          const pos = new THREE.Vector3(x, y, 0.66);
          hubVectorsWithMeta.push({ name: h.name, vec: pos, alignLeft: h.alignLeft });

          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xc6ff00 }),
          );
          sphere.position.copy(pos);
          mapGroup.add(sphere);

          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.24, 0.34, 18),
            new THREE.MeshBasicMaterial({
              color: 0xb2ff59,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.75,
            }),
          );
          ring.position.copy(pos);
          mapGroup.add(ring);
          beaconRings.push(ring);

          return pos;
        });

        const arcPairs: Array<[number, number, number]> = [
          [0, 1, 0.0],
          [2, 4, 0.25],
          [3, 4, 0.5],
          [5, 4, 0.75],
          [2, 1, 0.4],
        ];

        const tubeMat = new THREE.MeshBasicMaterial({
          color: 0x8bc34a,
          transparent: true,
          opacity: 0.7,
        });
        const photonMat = new THREE.MeshBasicMaterial({ color: 0xeaff7b });
        const photonGeom = new THREE.SphereGeometry(0.12, 10, 10);

        for (const [fromIdx, toIdx, offset] of arcPairs) {
          const start = hubVectors[fromIdx];
          const end = hubVectors[toIdx];
          if (!start || !end) continue;

          const mid = start.clone().add(end).multiplyScalar(0.5);
          mid.z += start.distanceTo(end) * 0.3 + 0.8;

          const curve = new THREE.CatmullRomCurve3([start, mid, end]);
          const tubeGeom = new THREE.TubeGeometry(curve, 24, 0.036, 6, false);
          mapGroup.add(new THREE.Mesh(tubeGeom, tubeMat));

          const photon = new THREE.Mesh(photonGeom, photonMat);
          mapGroup.add(photon);
          photonList.push({ curve, mesh: photon, offset });
        }

        updateHubScreenCoords();
        setIsLoaded(true);
      } catch {
        // Bỏ qua nếu không tải được file JSON
      }
    };

    void loadMap();

    // Tạm dừng render WebGL khi cuộn ra khỏi màn hình
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting;
      },
      { threshold: 0.02 },
    );
    observer.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastTime < 40) return;
      lastRaycastTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(provinceMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (activeMesh && activeMesh !== hit) {
          activeMesh.material = activeMesh.userData.defaultMat;
          activeMesh.position.z = 0;
        }
        activeMesh = hit;
        hit.material = hoverMat;
        hit.position.z = 0.25;
        setHoveredProvince({
          name: hit.userData.name,
          type: hit.userData.type,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        if (activeMesh) {
          activeMesh.material = activeMesh.userData.defaultMat;
          activeMesh.position.z = 0;
          activeMesh = null;
        }
        setHoveredProvince(null);
      }
    };

    const handlePointerLeave = () => {
      if (activeMesh) {
        activeMesh.material = activeMesh.userData.defaultMat;
        activeMesh.position.z = 0;
        activeMesh = null;
      }
      setHoveredProvince(null);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateHubScreenCoords();
    };
    window.addEventListener('resize', handleResize);

    let tick = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isInViewport || document.visibilityState === 'hidden') return;

      tick += 0.008;

      for (const p of photonList) {
        const t = (tick * 0.55 + p.offset) % 1;
        p.mesh.position.copy(p.curve.getPointAt(t));
      }

      beaconRings.forEach((ring, idx) => {
        const s = 1 + 0.4 * Math.sin(tick * 4 + idx);
        ring.scale.set(s, s, 1);
      });

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[460px] sm:h-[520px] lg:h-[550px]">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-emerald-200/80 animate-pulse">
          Đang tải bản đồ Việt Nam...
        </div>
      )}

      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* Nhãn tên các vùng liên kết */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {hubScreenCoords.map((hub) => (
          <div
            key={hub.name}
            style={{
              left: `${hub.x}px`,
              top: `${hub.y}px`,
              transform: hub.alignLeft
                ? 'translate(calc(-100% - 10px), -50%)'
                : 'translate(10px, -50%)',
            }}
            className="absolute px-2 py-0.5 rounded-md bg-[#061C0F]/90 border border-[#8BC34A]/50 text-[10px] font-bold text-[#ECFEFF] shadow-sm whitespace-nowrap"
          >
            {hub.name}
          </div>
        ))}
      </div>

      {hoveredProvince && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-1.5 rounded-xl bg-[#061C0F]/95 border border-[#8BC34A]/60 text-white shadow-lg"
          style={{
            left: Math.min(hoveredProvince.x + 14, 340),
            top: Math.max(hoveredProvince.y - 36, 12),
          }}
        >
          <p className="text-xs font-extrabold text-[#B2FF59]">{hoveredProvince.name}</p>
          <p className="text-[10px] text-emerald-100/80">{hoveredProvince.type} · Vùng liên kết</p>
        </div>
      )}
    </div>
  );
};
