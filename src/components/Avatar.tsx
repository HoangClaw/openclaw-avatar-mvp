'use client';

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import VISEMES from "@/lib/lipsync/visemes";
import { lipsyncManager } from "@/lib/lipsync/lipsyncManager";

const setupMode = false;

export function Avatar(props: any) {
  const { nodes, materials, scene } = useGLTF("/model.glb") as any;
  const { animations } = useGLTF("/animations.glb") as any;

  const smoothMovements = true; // Default to true

  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState(
    animations.find((a: THREE.AnimationClip) => a.name === "Idle") ? "Idle" : animations[0].name
  );

  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        ?.reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
    }
    return () => {
      actions[animation]?.fadeOut(0.5);
    };
  }, [animation, actions, mixer]);

  const lerpMorphTarget = (target: string, value: number, speed = 0.1) => {
    scene.traverse((child: any) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );
      }
    });
  };

  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);

  useFrame(() => {
    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    // LIPSYNC
    if (setupMode) {
      return;
    }
    
    // We need to process audio every frame if connected
    // But usually processAudio is called in the render loop or separate loop.
    // In the reference, it calls lipsyncManager.processAudio() in the loop.
    // Check if lipsyncManager has processAudio method. Yes.
    // It should be called before using the viseme.
    lipsyncManager.processAudio();

    const viseme = lipsyncManager.viseme;
    const state = lipsyncManager.state;
    
    // Convert enum value to string if needed, or match directly.
    // The viseme from manager is VISEMES enum.
    // The morph targets on the model are strings like "viseme_aa".
    // The enum values are "viseme_aa" etc. So it matches directly.

    lerpMorphTarget(
      viseme,
      1,
      smoothMovements ? (state === "vowel" ? 0.2 : 0.4) : 1
    );

    Object.values(VISEMES).forEach((value) => {
      if (viseme === value) {
        return;
      }
      lerpMorphTarget(
        value,
        0,
        smoothMovements ? (state === "vowel" ? 0.1 : 0.2) : 1
      );
    });
  });

  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/model.glb");
useGLTF.preload("/animations.glb");
