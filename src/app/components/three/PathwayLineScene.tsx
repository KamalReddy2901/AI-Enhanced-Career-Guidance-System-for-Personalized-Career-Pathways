import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { Group } from 'three';

interface PathwayLineSceneProps { labels: string[]; }

function InkRoute({ labels }: PathwayLineSceneProps) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const points = useMemo(() => labels.slice(0, 6).map((_, i) => new Vector3(-2.5 + i, Math.sin(i * 1.5) * .55, 0)), [labels]);
  const curve = useMemo(() => new CatmullRomCurve3(points), [points]);
  useFrame(({camera,clock}) => {
    camera.position.x = Math.sin(clock.elapsedTime * .12) * .25;
    camera.lookAt(0,0,0);
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * .15) * .06;
  });
  if (points.length < 2) return null;
  return <group ref={group}>
    <mesh><tubeGeometry args={[curve,64,.035,8,false]}/><meshStandardMaterial color="#1a1a1a" roughness={1}/></mesh>
    {points.map((point,index)=><mesh key={labels[index]} position={point} onPointerOver={()=>setHovered(index)} onPointerOut={()=>setHovered(null)}>
      <sphereGeometry args={[.12,16,16]}/><meshStandardMaterial color={hovered===index?'#b42318':'#1a1a1a'} emissive={hovered===index?'#b42318':'#000000'} emissiveIntensity={.35}/>
      {hovered===index && <Html center distanceFactor={8}><span className="whitespace-nowrap border border-black bg-[var(--paper)] px-2 py-1 font-[JetBrains_Mono] text-[9px] uppercase">{labels[index]}</span></Html>}
    </mesh>)}
  </group>;
}

export function PathwayLineScene({ labels }: PathwayLineSceneProps) {
  return <Canvas gl={{alpha:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,0,6],fov:42}}>
    <ambientLight intensity={1.4}/><directionalLight position={[3,4,5]} intensity={1}/><InkRoute labels={labels}/>
  </Canvas>;
}
