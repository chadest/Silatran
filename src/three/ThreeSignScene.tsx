/**
 * @file src/three/ThreeSignScene.tsx
 * @description Scène Three.js hébergeant l'avatar articulé (Cartoon, Humain Réaliste PBR ou Modèle GLB importé).
 * Conforme aux directives de rendu studio PBR, éclairage 3-points, gestion WebGL logiciel et retargeting universel.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AvatarConfig, SequenceItem, CharacterPose } from '../types/signs';
import {
  buildCharacterModel,
  applyPoseToCharacter,
  CharacterRig,
} from './characterModel';
import { buildRealisticCharacterModel } from './realisticCharacterModel';
import { loadGLBModel, applyPoseToGLB, LoadedGLBRig } from './glbRetargeter';
import { AnimationController } from './animationEngine';

export type CameraPreset = 'front' | 'hand' | 'angle';

interface ThreeSignSceneProps {
  sequence: SequenceItem[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  soundEnabled: boolean;
  avatarConfig: AvatarConfig;
  cameraPreset: CameraPreset;
  livePoseOverride?: CharacterPose | null;
  onIndexChange: (index: number) => void;
  onPlaybackComplete: () => void;
  onGLBStatusChange?: (status: { loading: boolean; error?: string; boneCount?: number }) => void;
}

export const ThreeSignScene: React.FC<ThreeSignSceneProps> = ({
  sequence,
  currentIndex,
  isPlaying,
  speed,
  soundEnabled,
  avatarConfig,
  cameraPreset,
  livePoseOverride,
  onIndexChange,
  onPlaybackComplete,
  onGLBStatusChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const activeModelGroupRef = useRef<THREE.Group | null>(null);
  const characterRigRef = useRef<CharacterRig | null>(null);
  const loadedGLBRigRef = useRef<LoadedGLBRig | null>(null);
  const livePoseRef = useRef<CharacterPose | null>(null);

  useEffect(() => {
    livePoseRef.current = livePoseOverride || null;
  }, [livePoseOverride]);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [glbLoading, setGlbLoading] = useState(false);

  // Cible de caméra pour les transitions fluides (ajustée sur le buste et visage du modèle humain ~1.70m)
  const targetCamPos = useRef(new THREE.Vector3(0, 1.30, 2.05));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.18, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.18, 0));

  // Mise à jour de la cible de vue de caméra selon le preset
  useEffect(() => {
    if (cameraPreset === 'hand') {
      targetCamPos.current.set(0.20, 1.25, 1.05);
      targetLookAt.current.set(0.18, 1.18, 0.1);
    } else if (cameraPreset === 'angle') {
      targetCamPos.current.set(1.20, 1.35, 1.60);
      targetLookAt.current.set(0, 1.18, 0);
    } else {
      targetCamPos.current.set(0, 1.30, 2.05);
      targetLookAt.current.set(0, 1.18, 0);
    }
  }, [cameraPreset]);

  // Synchronisation du contrôleur d'animation avec les props
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSequence(sequence);
    }
  }, [sequence]);

  useEffect(() => {
    if (controllerRef.current) {
      if (isPlaying) {
        controllerRef.current.play();
      } else {
        controllerRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSpeed(speed);
    }
  }, [speed]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSoundEnabled(soundEnabled);
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (controllerRef.current && controllerRef.current.getCurrentIndex() !== currentIndex) {
      controllerRef.current.jumpToIndex(currentIndex);
    }
  }, [currentIndex]);

  // Token pour éviter les courses asynchrones lors du chargement des modèles 3D
  const loadTokenRef = useRef(0);

  // Fonction unifiée de chargement et d'assignation du modèle 3D dans la scène
  const loadModelIntoScene = React.useCallback(
    (config: AvatarConfig, scene: THREE.Scene) => {
      const currentToken = ++loadTokenRef.current;

      // Nettoyer le modèle précédent
      if (activeModelGroupRef.current) {
        scene.remove(activeModelGroupRef.current);
        activeModelGroupRef.current = null;
      }
      characterRigRef.current = null;
      loadedGLBRigRef.current = null;

      if (config.modelType === 'glb_custom' && config.glbUrl) {
        setGlbLoading(true);
        if (onGLBStatusChange) onGLBStatusChange({ loading: true });

        loadGLBModel(config.glbUrl, config.glbScale || 1.0, config.glbOffsetY || 0.0)
          .then((glbRig) => {
            if (loadTokenRef.current !== currentToken) return;
            loadedGLBRigRef.current = glbRig;
            activeModelGroupRef.current = glbRig.container;
            scene.add(glbRig.container);
            setGlbLoading(false);
            if (onGLBStatusChange) {
              onGLBStatusChange({ loading: false, boneCount: glbRig.detectedBonesCount });
            }
          })
          .catch((err) => {
            if (loadTokenRef.current !== currentToken) return;
            console.error('Erreur de chargement GLB:', err);
            setGlbLoading(false);
            if (onGLBStatusChange) {
              onGLBStatusChange({
                loading: false,
                error: 'Erreur GLB: ' + (err?.message || 'fichier introuvable'),
              });
            }
            // En cas d'erreur de chargement GLB, utiliser l'avatar réaliste studio PBR
            const rig = buildRealisticCharacterModel(config);
            characterRigRef.current = rig;
            activeModelGroupRef.current = rig.root;
            scene.add(rig.root);
          });
      } else if (config.modelType === 'realistic') {
        const rig = buildRealisticCharacterModel(config);
        characterRigRef.current = rig;
        activeModelGroupRef.current = rig.root;
        scene.add(rig.root);
        if (onGLBStatusChange) onGLBStatusChange({ loading: false });
      } else {
        const rig = buildCharacterModel(config);
        characterRigRef.current = rig;
        activeModelGroupRef.current = rig.root;
        scene.add(rig.root);
        if (onGLBStatusChange) onGLBStatusChange({ loading: false });
      }
    },
    [onGLBStatusChange]
  );

  // Mettre à jour le modèle lorsque la configuration change
  useEffect(() => {
    if (sceneRef.current) {
      loadModelIntoScene(avatarConfig, sceneRef.current);
    }
  }, [avatarConfig.modelType, avatarConfig.glbUrl, avatarConfig.glbScale, avatarConfig.glbOffsetY, loadModelIntoScene]);

  // Initialisation de la scène Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Détection WebGL logiciel pour optimiser les performances
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Scène et Caméra
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.copy(targetCamPos.current);
    cameraRef.current = camera;

    // 3. Renderer moderne PBR
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Environnement de studio RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Éclairage studio 3-points équilibré
    const hemiLight = new THREE.HemisphereLight(0xecfeff, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    keyLight.position.set(2.5, 4.0, 3.0);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 10;
      keyLight.shadow.camera.left = -1.5;
      keyLight.shadow.camera.right = 1.5;
      keyLight.shadow.camera.top = 2.0;
      keyLight.shadow.camera.bottom = -0.5;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-2.5, 2.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 3.5, -2.5);
    scene.add(rimLight);

    // 6. Sol de studio discret
    const floorGeom = new THREE.CircleGeometry(4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Cercle lumineux au sol
    const ringGeom = new THREE.RingGeometry(1.1, 1.14, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, opacity: 0.35, transparent: true });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // Initialisation initiale du modèle selon configuration (Teen Boy 3D réaliste par défaut)
    loadModelIntoScene(avatarConfig, scene);

    // 8. Contrôles de rotation orbitale
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.8;
    controls.maxDistance = 5.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.target.copy(currentLookAt.current);
    controlsRef.current = controls;

    // 9. Initialisation du contrôleur d'animation
    const controller = new AnimationController(
      (newIdx) => onIndexChange(newIdx),
      () => onPlaybackComplete()
    );
    controller.setSequence(sequence);
    controller.setSpeed(speed);
    controller.setSoundEnabled(soundEnabled);
    if (isPlaying) controller.play();
    controllerRef.current = controller;

    // 10. Boucle d'animation
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Interpolation de la caméra
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.current.x, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.current.y, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.current.z, 3.5, delta);

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.current.x, 4.0, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.current.y, 4.0, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.current.z, 4.0, delta);
      controls.target.copy(currentLookAt.current);

      controls.update();

      // Application des poses (soit caméra direct live, soit contrôleur d'animation)
      if (livePoseRef.current) {
        if (loadedGLBRigRef.current) {
          applyPoseToGLB(loadedGLBRigRef.current, livePoseRef.current);
        } else if (characterRigRef.current) {
          applyPoseToCharacter(characterRigRef.current, livePoseRef.current);
        }
      } else if (controllerRef.current) {
        const currentPose = controllerRef.current.update(delta);

        if (loadedGLBRigRef.current) {
          applyPoseToGLB(loadedGLBRigRef.current, currentPose);
        } else if (characterRigRef.current) {
          applyPoseToCharacter(characterRigRef.current, currentPose);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Mise à jour des couleurs sur les modèles procéduraux
  useEffect(() => {
    if (characterRigRef.current) {
      const { materials, head } = characterRigRef.current;
      if (materials.skin) materials.skin.color.set(avatarConfig.skinColor);
      if (materials.clothing) materials.clothing.color.set(avatarConfig.clothingColor);
      if (materials.hair) materials.hair.color.set(avatarConfig.hairColor);
      if (materials.eyebrow) materials.eyebrow.color.set(new THREE.Color(avatarConfig.hairColor).multiplyScalar(0.7));
      if (head && head.glassesGroup) head.glassesGroup.visible = avatarConfig.hasGlasses;
    }
  }, [avatarConfig.skinColor, avatarConfig.clothingColor, avatarConfig.hairColor, avatarConfig.hasGlasses]);

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden select-none bg-slate-900">
      <div ref={mountRef} className="w-full h-full" />
      {glbLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs z-10 text-white text-xs space-x-2">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Chargement du modèle GLB / Squelette 3D...</span>
        </div>
      )}
    </div>
  );
};
