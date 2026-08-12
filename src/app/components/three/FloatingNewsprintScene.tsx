import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { CanvasTexture, LinearFilter, MathUtils, type Group } from 'three';

const sheets = [
  [-2.2, .7, -.4, -.12], [-1.15, -.9, .1, .1], [0, .25, -.6, -.06],
  [1.2, -.65, .2, .09], [2.15, .85, -.2, -.1], [.45, 1.35, -.8, .06],
] as const;

interface FloatingNewsprintSceneProps { progressRef?: MutableRefObject<number>; wordmark?: string; }

function NewsprintSheets({progressRef,wordmark}:FloatingNewsprintSceneProps) {
  const group = useRef<Group>(null);
  const texture = useMemo(()=>{
    if(!wordmark || typeof document==='undefined') return undefined;
    const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=1024;
    const context=canvas.getContext('2d'); if(!context) return undefined;
    context.fillStyle='#f9f8f7';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#1a1a1a';context.textAlign='center';context.font='italic 700 68px Georgia';
    wordmark.split(/\s+/).forEach((word,index)=>context.fillText(word,canvas.width/2,360+index*82));
    context.fillRect(90,590,588,3);context.font='24px monospace';context.fillText('THE CAREERCASE DAILY',canvas.width/2,650);
    const result=new CanvasTexture(canvas);result.minFilter=LinearFilter;return result;
  },[wordmark]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y += (state.pointer.x * .1 - group.current.rotation.y) * .035;
    group.current.rotation.x += (-state.pointer.y * .06 - group.current.rotation.x) * .035;
    const assemble=MathUtils.clamp((progressRef?.current ?? 0)/.4,0,1);
    group.current.children.forEach((sheet, index) => {
      const [baseX,baseY,baseZ,baseR]=sheets[index];
      sheet.position.x=MathUtils.lerp(baseX,1.1+index*.025,assemble);
      sheet.position.y=MathUtils.lerp(baseY+Math.sin(t*.35+index)*.11,-.1+index*.025,assemble);
      sheet.position.z=MathUtils.lerp(baseZ,index*.035,assemble);
      sheet.rotation.z=MathUtils.lerp(baseR+Math.sin(t*.22+index)*.025,index*.012,assemble);
    });
  });
  return <group ref={group}>{sheets.map(([x,y,z,r], index) => <mesh key={index} position={[x,y,z]} rotation={[0,0,r]}>
    <planeGeometry args={[1.25, 1.7]} />
    <meshStandardMaterial color="#f9f8f7" roughness={.95} map={index===sheets.length-1?texture:undefined} />
    <Edges color="#1a1a1a" threshold={10} />
  </mesh>)}</group>;
}

export function FloatingNewsprintScene(props:FloatingNewsprintSceneProps) {
  return <Canvas gl={{alpha:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,0,6],fov:45}}>
    <ambientLight intensity={1.5}/><directionalLight position={[4,5,6]} intensity={1}/><NewsprintSheets {...props}/>
  </Canvas>;
}
