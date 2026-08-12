import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

const sheets = [
  [-2.2, .7, -.4, -.12], [-1.15, -.9, .1, .1], [0, .25, -.6, -.06],
  [1.2, -.65, .2, .09], [2.15, .85, -.2, -.1], [.45, 1.35, -.8, .06],
] as const;

function NewsprintSheets() {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y += (state.pointer.x * .1 - group.current.rotation.y) * .035;
    group.current.rotation.x += (-state.pointer.y * .06 - group.current.rotation.x) * .035;
    group.current.children.forEach((sheet, index) => {
      sheet.position.y = sheets[index][1] + Math.sin(t * .35 + index) * .11;
      sheet.rotation.z = sheets[index][3] + Math.sin(t * .22 + index) * .025;
    });
  });
  return <group ref={group}>{sheets.map(([x,y,z,r], index) => <mesh key={index} position={[x,y,z]} rotation={[0,0,r]}>
    <planeGeometry args={[1.25, 1.7]} />
    <meshStandardMaterial color="#f9f8f7" roughness={.95} />
    <Edges color="#1a1a1a" threshold={10} />
  </mesh>)}</group>;
}

export function FloatingNewsprintScene() {
  return <Canvas gl={{alpha:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,0,6],fov:45}}>
    <ambientLight intensity={1.5}/><directionalLight position={[4,5,6]} intensity={1}/><NewsprintSheets/>
  </Canvas>;
}
