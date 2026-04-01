"use client"

import * as THREE from 'three'
import React, { useEffect, useRef, useState, Suspense, useMemo } from 'react'
import { Canvas, extend, useThree, useFrame, ThreeElement } from '@react-three/fiber'
import { useGLTF, useTexture, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, RapierRigidBody } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'

// Register MeshLine elements for React Three Fiber
extend({ MeshLineGeometry, MeshLineMaterial })

// Add type definitions for MeshLine elements to the R3F and React JSX namespaces
declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
        meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
      }
    }
  }
}

// Preload assets for better performance
useGLTF.preload('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb')
useTexture.preload('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/SOT1hmCesOHxEYxL7vkoZ/c57b29c85912047c414311723320c16b/band.jpg')

function Band({ maxSpeed = 50, minSpeed = 10 }) {
  const band = useRef<any>(null)
  const fixed = useRef<RapierRigidBody>(null!)
  const j1 = useRef<RapierRigidBody>(null!)
  const j2 = useRef<RapierRigidBody>(null!)
  const j3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)
  
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  
  const segmentProps: any = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 6, linearDamping: 6 }
  
  const { nodes, materials } = useGLTF('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb') as any
  const texture = useTexture('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/SOT1hmCesOHxEYxL7vkoZ/c57b29c85912047c414311723320c16b/band.jpg')
  const { width, height } = useThree((state) => state.size)
  const resolution = useMemo(() => new THREE.Vector2(width, height), [width, height])
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]))
  const [dragged, drag] = useState<THREE.Vector3 | false>(false)
  const [hovered, hover] = useState(false)

  // Configure Rope and Spherical Joints
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => { document.body.style.cursor = 'auto' }
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ 
        x: vec.x - dragged.x, 
        y: vec.y - dragged.y, 
        z: vec.z - dragged.z 
      })
    }
    
    if (fixed.current) {
      // Fix most of the jitter when over pulling the card (pattern from App.jsx + j3)
      ;[j1, j2, j3].forEach((ref) => {
        const anyRef = ref.current as any
        if (!anyRef.lerped) anyRef.lerped = new THREE.Vector3().copy(anyRef.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, anyRef.lerped.distanceTo(anyRef.translation())))
        anyRef.lerped.lerp(anyRef.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)))
      })

      // Update curve points using the smooth lerped values
      curve.points[0].copy((j3.current as any).lerped)
      curve.points[1].copy((j2.current as any).lerped)
      curve.points[2].copy((j1.current as any).lerped)
      curve.points[3].copy(fixed.current.translation())
      
      if (band.current) {
        band.current.geometry.setPoints(curve.getPoints(64))
      }
      
      // Tilt logic
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation() as any)
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true)
    }
  })

  curve.curveType = 'chordal'
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  return (
    <>
      <group position={[4, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody 
          position={[2, 0, 0]} 
          ref={card} 
          {...segmentProps} 
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => { (e.target as any).releasePointerCapture(e.pointerId); drag(false) }}
            onPointerDown={(e) => { 
                (e.target as any).setPointerCapture(e.pointerId); 
                drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current!.translation()))) 
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial 
                map={materials.base.map} 
                map-anisotropy={16} 
                clearcoat={1} 
                clearcoatRoughness={0.15} 
                roughness={0.3} 
                metalness={0.5} 
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial 
           args={[{ resolution }]}
           color="black" 
           depthTest={true} 
           transparent={true}
           useMap={0} 
           repeat={[-3, 1]} 
           lineWidth={0.15}
        />
      </mesh>
    </>
  )
}

export default function InteractiveID() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [2, 1.5, 13], fov: 28 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={2} />
        <directionalLight position={[5, 10, 5]} intensity={3} castShadow />
        <Suspense fallback={null}>
            <Physics interpolate gravity={[0, -20, 0]} timeStep={1 / 60}>
              <Band />
            </Physics>
            <Environment blur={0.75}>
              <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
            </Environment>
            <ContactShadows opacity={0.6} scale={20} blur={24} far={10} resolution={256} color="#000000" />
        </Suspense>
      </Canvas>
    </div>
  )
}
