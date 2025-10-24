/*
GloveConfigurator - React + @react-three/fiber MVP (Dark Mode, Procedural Fallback Model)
This project is packaged to run without an external GLB: it will try to load /public/models/glove_v1.glb,
but if not present it uses a simple procedural mock glove made from spheres & planes to demonstrate interaction.

Install deps:
  npm install
Run:
  npm run dev

Notes:
- This is a demo/mock for testing the UI and 3D interactions. Replace procedural model with a real GLB when ready.
*/

import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import create from 'zustand';
import { ChromePicker } from 'react-color';

// -----------------------------
// Config
// -----------------------------
const PART_KEYS = [
  'glove_backhand',
  'glove_palm',
  'glove_web',
  'glove_laces',
  'glove_welting',
  'glove_binding',
  'glove_wriststrap',
  'glove_logo_patch',
  'glove_stitching'
];

const DEFAULT_PART_SETTINGS = {
  material: 'full_grain',
  color: '#b06b4a',
  pattern: 'none'
};

// -----------------------------
// Store
// -----------------------------
const useStore = create((set, get) => ({
  selectedPart: PART_KEYS[0],
  parts: PART_KEYS.reduce((acc, k) => { acc[k] = { ...DEFAULT_PART_SETTINGS }; return acc; }, {}),
  embroidery: { targets: { wriststrap: null, thumb: null, patch: null } },
  setPartColor: (part, color) => set(state => ({ parts: { ...state.parts, [part]: { ...state.parts[part], color } } })),
  setPartMaterial: (part, material) => set(state => ({ parts: { ...state.parts, [part]: { ...state.parts[part], material } } })),
  selectPart: part => set({ selectedPart: part }),
  resetDesign: () => set({ parts: PART_KEYS.reduce((acc, k) => { acc[k] = { ...DEFAULT_PART_SETTINGS }; return acc; }, {}), embroidery: { targets: { wriststrap: null, thumb: null, patch: null } } }),
  setEmbroideryTarget: (targetKey, payload) => set(state => ({ embroidery: { ...state.embroidery, targets: { ...state.embroidery.targets, [targetKey]: payload } } })),
  getDesignJSON: () => ({ parts: get().parts, embroidery: get().embroidery, createdAt: new Date().toISOString() })
}));

// -----------------------------
// Utility: create canvas texture
// -----------------------------
function createTextTexture({ text = '', font = '48px Montserrat', color = '#ffffff', padding = 20, scale = 2 }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const measure = ctx.measureText(text || '');
  const width = Math.max(256, Math.ceil((measure.width + padding * 2) * scale));
  const height = Math.max(128, Math.ceil((parseInt(font, 10) + padding * 2) * scale));
  canvas.width = width;
  canvas.height = height;
  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const x = (canvas.width / scale) / 2;
  const y = (canvas.height / scale) / 2;
  ctx.fillText(text, x, y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.strokeText(text, x, y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

// -----------------------------
// Procedural mock glove (fallback)
// -----------------------------
function ProceduralGlove({ appliedParts, onPartClick, embroideryTargets }) {
  // simple group of meshes representing parts
  const groupRef = useRef();
  useFrame(({clock})=>{
    // slow idle rotation
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.05;
  });

  // create refs for clickable meshes
  const refs = useMemo(() => {
    const r = {};
    PART_KEYS.forEach(k=> r[k] = React.createRef());
    return r;
  }, []);

  // Apply colors/materials
  useEffect(() => {
    PART_KEYS.forEach(key => {
      const ref = refs[key].current;
      if (!ref) return;
      try {
        ref.material.color = new THREE.Color(appliedParts[key]?.color || '#ffffff');
        const mat = ref.material;
        if (appliedParts[key]?.material === 'suede') {
          mat.roughness = 0.9; mat.metalness = 0.0;
        } else if (appliedParts[key]?.material === 'full_grain') {
          mat.roughness = 0.5; mat.metalness = 0.0;
        } else {
          mat.roughness = 0.6; mat.metalness = 0.05;
        }
      } catch(e){}
    });
  }, [appliedParts, refs]);

  // Apply embroidery textures to wriststrap/patch
  useEffect(()=>{
    const map = { wriststrap: 'glove_wriststrap', patch: 'glove_logo_patch', thumb: 'glove_backhand' };
    Object.entries(embroideryTargets||{}).forEach(([t, settings])=>{
      const meshKey = map[t];
      const ref = refs[meshKey]?.current;
      if(!ref) return;
      if(!settings){
        // clear
        ref.material.map = null; ref.material.needsUpdate = true; return;
      }
      const tex = createTextTexture({ text: settings.text||'', font: `${Math.max(24, settings.size||48)}px ${settings.font||'Montserrat'}`, color: settings.color||'#fff', padding: 20, scale: 4 });
      const mat = ref.material.clone();
      mat.map = tex; mat.transparent = true; mat.alphaTest = 0.5; mat.needsUpdate = true;
      ref.material = mat;
    });
  }, [embroideryTargets, refs]);

  // simple geometry layout: palm = large sphere, backhand = box, web = plane, laces = small cylinders, wriststrap = box, patch = small plane
  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* palm */}
      <mesh ref={refs['glove_palm']} position={[0, -0.15, 0]} castShadow>
        <sphereGeometry args={[0.45, 32, 24]} />
        <meshStandardMaterial color={appliedParts['glove_palm'].color} metalness={0} roughness={0.6} />
      </mesh>

      {/* backhand */}
      <mesh ref={refs['glove_backhand']} position={[0, 0.18, 0.05]} rotation={[-0.7,0,0]}>
        <boxGeometry args={[0.9,0.5,0.2]} />
        <meshStandardMaterial color={appliedParts['glove_backhand'].color} />
      </mesh>

      {/* web */}
      <mesh ref={refs['glove_web']} position={[0.15, 0.02, 0.48]} rotation={[0.2,0.8,0]}>
        <planeGeometry args={[0.35,0.25]} />
        <meshStandardMaterial color={appliedParts['glove_web'].color} side={THREE.DoubleSide} />
      </mesh>

      {/* laces - three thin cylinders */}
      <group position={[-0.05, 0.02, 0.35]}>
        <mesh ref={refs['glove_laces']} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.02,0.02,0.9,12]} />
          <meshStandardMaterial color={appliedParts['glove_laces'].color} />
        </mesh>
      </group>

      {/* wriststrap */}
      <mesh ref={refs['glove_wriststrap']} position={[0, -0.45, 0.2]} rotation={[0.3,0,0]}>
        <boxGeometry args={[0.6,0.12,0.12]} />
        <meshStandardMaterial color={appliedParts['glove_wriststrap'].color} />
      </mesh>

      {/* logo patch */}
      <mesh ref={refs['glove_logo_patch']} position={[0.18, -0.44, 0.26]} rotation={[0.3,0,0]}>
        <planeGeometry args={[0.18,0.08]} />
        <meshStandardMaterial color={appliedParts['glove_logo_patch'].color} side={THREE.DoubleSide} transparent />
      </mesh>

      {/* stitching (simple ring) */}
      <mesh ref={refs['glove_stitching']} position={[0,0.05,0.6]}>
        <torusGeometry args={[0.6, 0.015, 8, 64]} />
        <meshStandardMaterial color={appliedParts['glove_stitching'].color} />
      </mesh>
    </group>
  );
}

// -----------------------------
// Canvas wrapper
// -----------------------------
function GloveCanvas({ appliedParts, onPartClick, embroideryTargets }) {
  return (
    <div className="w-full h-[620px] bg-black rounded-lg overflow-hidden border border-gray-800">
      <Canvas camera={{ position: [0, 0.6, 2.6], fov: 40 }}>
        <color attach="background" args={['#0b0b0b']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.9} />
        <Suspense fallback={<Html center>Loading model...</Html>}>
          <ProceduralGlove appliedParts={appliedParts} onPartClick={onPartClick} embroideryTargets={embroideryTargets} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
}

// -----------------------------
// Embroidery panel
// -----------------------------
function EmbroideryPanel(){
  const embroidery = useStore(state=>state.embroidery);
  const setEmbroideryTarget = useStore(state=>state.setEmbroideryTarget);
  const [activeTarget, setActiveTarget] = useState('wriststrap');
  const current = embroidery.targets[activeTarget];

  const [text, setText] = useState(current?.text || '');
  const [font, setFont] = useState(current?.font || 'Montserrat');
  const [size, setSize] = useState(current?.size || 48);
  const [color, setColor] = useState(current?.color || '#ffffff');

  useEffect(()=> {
    setText(current?.text || '');
    setFont(current?.font || 'Montserrat');
    setSize(current?.size || 48);
    setColor(current?.color || '#ffffff');
  }, [activeTarget, embroidery]);

  function apply(){
    setEmbroideryTarget(activeTarget, { text, font, size, color });
  }
  function clearTarget(){ setEmbroideryTarget(activeTarget, null); }

  return (
    <div className="border border-gray-800 p-3 rounded mb-3 bg-gray-900">
      <h3 className="font-medium">Embroidery / Text</h3>
      <div className="mt-2">
        <label className="block text-xs">Target</label>
        <select className="w-full p-2 border rounded mt-1 bg-black" value={activeTarget} onChange={e=>setActiveTarget(e.target.value)}>
          <option value="wriststrap">Wriststrap</option>
          <option value="thumb">Thumb / Name</option>
          <option value="patch">Logo Patch</option>
        </select>
      </div>

      <div className="mt-2">
        <label className="block text-xs">Text</label>
        <input value={text} onChange={e=>setText(e.target.value)} className="w-full p-2 border rounded mt-1 bg-black" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs">Font</label>
          <select value={font} onChange={e=>setFont(e.target.value)} className="w-full p-2 border rounded mt-1 bg-black">
            <option>Montserrat</option>
            <option>Roboto</option>
            <option>Arial</option>
            <option>Times New Roman</option>
            <option>Playfair Display</option>
          </select>
        </div>
        <div>
          <label className="block text-xs">Size</label>
          <input type="number" value={size} onChange={e=>setSize(Number(e.target.value))} className="w-full p-2 border rounded mt-1 bg-black" />
        </div>
      </div>

      <div className="mt-2">
        <label className="block text-xs">Color</label>
        <div className="flex items-center gap-2 mt-1">
          <div style={{ width: 28, height: 28, background: color, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
          <input value={color} onChange={e=>setColor(e.target.value)} className="p-2 border rounded bg-black" />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="px-3 py-2 rounded bg-yellow-500 text-black" onClick={apply}>Apply</button>
        <button className="px-3 py-2 rounded border" onClick={clearTarget}>Clear</button>
      </div>
    </div>
  );
}

// -----------------------------
// Main UI
// -----------------------------
export default function GloveConfigurator(){
  const selectedPart = useStore(state=>state.selectedPart);
  const parts = useStore(state=>state.parts);
  const selectPart = useStore(state=>state.selectPart);
  const setPartColor = useStore(state=>state.setPartColor);
  const setPartMaterial = useStore(state=>state.setPartMaterial);
  const resetDesign = useStore(state=>state.resetDesign);
  const getDesignJSON = useStore(state=>state.getDesignJSON);
  const loadDesignJSON = useStore(state=>state.loadDesignJSON);
  const embroideryTargets = useStore(state=>state.embroidery.targets);

  const [localColor, setLocalColor] = useState(parts[selectedPart]?.color || '#ffffff');
  const [isPickerOpen, setPickerOpen] = useState(false);

  useEffect(()=>{ setLocalColor(parts[selectedPart]?.color || '#ffffff'); }, [selectedPart, parts]);

  function handleColorChangeComplete(color){ setLocalColor(color.hex); setPartColor(selectedPart, color.hex); }
  function handleMaterialChange(e){ setPartMaterial(selectedPart, e.target.value); }

  function saveToLocal(){ const json = getDesignJSON(); localStorage.setItem('latestGloveDesign', JSON.stringify(json)); alert('Design saved locally.'); }
  function downloadDesign(){ const json = getDesignJSON(); const blob = new Blob([JSON.stringify(json,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`glove-design-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }
  function loadFromLocal(){ const raw = localStorage.getItem('latestGloveDesign'); if(!raw) return alert('No saved design found'); try{ loadDesignJSON(JSON.parse(raw)); }catch(e){ alert('Failed to parse'); } }

  function exportThumbnail(){ const canvas = document.querySelector('canvas'); if(!canvas) return alert('Canvas not found'); try{ const data = canvas.toDataURL('image/png'); const a = document.createElement('a'); a.href=data; a.download=`glove-thumb-${Date.now()}.png`; a.click(); }catch(e){ alert('Failed to export'); } }

  function handlePartClick(name){ selectPart(name); }

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <h2 className="text-2xl font-semibold mb-3">Custom Glove Configurator</h2>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <GloveCanvas appliedParts={parts} onPartClick={handlePartClick} embroideryTargets={embroideryTargets} />
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-2 rounded bg-yellow-500 text-black" onClick={saveToLocal}>Save (local)</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={loadFromLocal}>Load (local)</button>
            <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={downloadDesign}>Download JSON</button>
            <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={exportThumbnail}>Export Thumbnail</button>
            <button className="px-3 py-2 rounded border" onClick={resetDesign}>Reset</button>
          </div>
        </div>

        <div className="col-span-5">
          <div className="border border-gray-800 p-3 rounded mb-3 bg-gray-900">
            <h3 className="font-medium">Selected part</h3>
            <p className="text-sm text-gray-400">{selectedPart}</p>

            <div className="mt-3">
              <label className="block text-sm font-medium">Color</label>
              <div className="flex items-center gap-2 mt-2">
                <div style={{ width: 36, height: 36, borderRadius: 6, background: localColor, border: '1px solid rgba(255,255,255,0.08)' }} onClick={()=>setPickerOpen(v=>!v)}></div>
                <div className="text-xs text-gray-400">{localColor}</div>
              </div>
              {isPickerOpen && <div className="mt-3"><ChromePicker color={localColor} onChangeComplete={handleColorChangeComplete} disableAlpha /></div>}
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium">Material</label>
              <select className="mt-2 w-full border rounded p-2 bg-black" value={parts[selectedPart]?.material || 'full_grain'} onChange={handleMaterialChange}>
                <option value="full_grain">Full-grain leather</option>
                <option value="suede">Suede</option>
                <option value="synthetic">Synthetic</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium">Quick-presets</label>
              <div className="flex gap-2 mt-2">
                <button className="px-2 py-1 border rounded text-sm" onClick={()=>{ setPartColor(selectedPart,'#000000'); setPartMaterial(selectedPart,'full_grain'); }}>Black</button>
                <button className="px-2 py-1 border rounded text-sm" onClick={()=>{ setPartColor(selectedPart,'#ffffff'); setPartMaterial(selectedPart,'full_grain'); }}>White</button>
                <button className="px-2 py-1 border rounded text-sm" onClick={()=>{ setPartColor(selectedPart,'#ffd700'); setPartMaterial(selectedPart,'suede'); }}>Gold Suede</button>
              </div>
            </div>

          </div>

          <div className="border border-gray-800 p-3 rounded mb-3 bg-gray-900">
            <h3 className="font-medium">Parts (click in 3D or select)</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PART_KEYS.map(k=>(
                <button key={k} onClick={()=>selectPart(k)} className={`p-2 text-left rounded border ${k===selectedPart? 'outline outline-2 outline-offset-1 outline-yellow-400': ''} bg-black`}>
                  <div className="font-semibold text-sm">{k.replace('glove_','').replace('_',' ')}</div>
                  <div className="text-xs text-gray-400">{parts[k]?.material} • {parts[k]?.color}</div>
                </button>
              ))}
            </div>
          </div>

          <EmbroideryPanel />

          <div className="border border-gray-800 p-3 rounded bg-gray-900">
            <h3 className="font-medium">Design management</h3>
            <p className="text-sm text-gray-400 mt-2">Save your design to localStorage or download JSON for orders. The JSON includes an embroidery section for manufacturing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
