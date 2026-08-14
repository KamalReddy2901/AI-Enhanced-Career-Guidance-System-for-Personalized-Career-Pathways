import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PathwayRoute, PathwayStep } from '../../engine/types';
import type { Language } from '../../i18n';
import { localizedStep, localizedStepKind } from '../../i18n/guidanceFormatting';
import { sounds } from '../../utils/sounds';
import { hapticTap } from '../../utils/haptic';

export function PathwayGraph({ route, lang = 'en' }: { route: PathwayRoute; lang?: Language }) {
  const [selected, setSelected] = useState<PathwayStep | null>(null);
  const reduceMotion = useReducedMotion();
  const width = Math.max(800, route.steps.length * 200); // Increased spacing
  const months = lang === 'hi' ? 'महीने' : lang === 'te' ? 'నెలలు' : 'months';
  const nodeNote = lang === 'hi' ? 'यह नोड ज्ञान-आधार के कौशल, योग्यता या बदलाव प्रमाण से समर्थित है। समय या धन लगाने से पहले पासपोर्ट में संबंधित प्रमाण खोलें।' : lang === 'te' ? 'ఈ నోడ్ జ్ఞాన భాండాగారంలోని నైపుణ్యం, అర్హత లేదా మార్పు ఆధారంతో మద్దతు పొందింది. సమయం లేదా డబ్బు వెచ్చించే ముందు పాస్‌పోర్ట్‌లో సంబంధిత ఆధారాన్ని తెరవండి.' : 'This node is reachable because it is backed by a knowledge-base skill, qualification, or transition edge. Open the related evidence in your passport before committing time or money.';
  const durationLabel = (value: number) => lang === 'en' && value === 1 ? 'month' : months;
  const selectStep = (step: PathwayStep) => { sounds.expand(); hapticTap(); setSelected(step); };
  
  return (
    <div className="relative text-[var(--ink)]">
      <div className="overflow-x-auto border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4 shadow-lg">
        <svg 
          viewBox={`0 0 ${width} 220`} 
          className="min-w-[800px] w-full" 
          aria-label={`${route.label} pathway graph`}
        >
          <defs>
            <marker 
              id="path-arrow" 
              viewBox="0 0 10 10" 
              refX="8" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto"
            >
              <path d="M0 0l10 5-10 5z" fill="currentColor"/>
            </marker>
          </defs>
          
          {/* Connection arrows */}
          {route.steps.slice(0, -1).map((_, index) => (
            <motion.path 
              key={`edge-${index}`} 
              d={`M${110 + index * 200} 105 C${150 + index * 200} ${86 + (index % 2) * 28}, ${185 + index * 200} ${126 - (index % 2) * 28}, ${220 + index * 200} 105`}
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              markerEnd="url(#path-arrow)" 
              initial={{pathLength:0}} 
              animate={{pathLength:1}} 
              transition={{duration:reduceMotion ? 0 : .6,delay:reduceMotion ? 0 : index*.12}}
            />
          ))}
          
          {/* Step nodes */}
          {route.steps.map((step, index) => (
            <motion.g 
              key={`${step.kind}-${index}`} 
              onClick={() => selectStep(step)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectStep(step); } }}
              role="button" 
              tabIndex={0} 
              aria-label={`${localizedStep(step, lang)} · ${step.estMonths} ${durationLabel(step.estMonths)}`}
              data-testid={`pathway-graph-step-${index + 1}`}
              className="cursor-pointer" 
              initial={{opacity:0,y:8}} 
              animate={{opacity:1,y:0}} 
              transition={{delay:reduceMotion ? 0 : index*.12}}
            >
              {/* Node box - LARGER */}
              <path 
                d={`M${20 + index * 200} 60 q4 -5 10 0 h150 q6 3 2 9 v70 q2 8 -7 7 h-145 q-10 2 -10 -8z`}
                fill={step.done ? 'currentColor' : 'var(--paper-raised)'} 
                stroke="currentColor" 
                strokeWidth="2.5"
              />
              
              {/* Step type label */}
              <text 
                x={35 + index * 200} 
                y="83" 
                fontFamily="JetBrains Mono" 
                fontSize="10" 
                fontWeight="600"
                fill={step.done ? 'var(--paper)' : 'var(--ink-soft)'}
              >
                {localizedStepKind(step.kind, lang).toUpperCase()}
              </text>
              
              {/* Step name - MORE SPACE */}
              <foreignObject 
                x={35 + index * 200} 
                y="92" 
                width="135" 
                height="42"
              >
                <div className={`text-[12px] leading-snug font-medium ${step.done ? 'text-[var(--paper)]' : 'text-[var(--ink)]'}`}>
                  {localizedStep(step, lang)}
                </div>
              </foreignObject>
              
              {/* Duration label */}
              <text 
                x={35 + index * 200} 
                y="135" 
                fontFamily="JetBrains Mono" 
                fontSize="10" 
                fontWeight="600"
                fill={step.done ? 'var(--paper)' : 'var(--ink-soft)'}
              >
                {step.estMonths} {durationLabel(step.estMonths).toUpperCase()}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
      
      {/* Selected step detail panel */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-[65] border-t-2 border-[var(--ink)] bg-[var(--paper-raised)] p-5 shadow-2xl">
          <div className="mx-auto max-w-3xl">
            <div className="flex justify-between">
              <div>
                <div className="font-mono-ui text-[10px] uppercase tracking-widest">
                  {localizedStepKind(selected.kind, lang)} · {selected.estMonths} {durationLabel(selected.estMonths)}
                </div>
                <h3 className="font-display text-2xl">
                  {localizedStep(selected, lang)}
                </h3>
              </div>
              <button 
                className="min-h-11 min-w-11 border border-[var(--ink-faint)]" 
                onClick={() => { sounds.collapse(); setSelected(null); }}
                aria-label={lang === 'hi' ? 'चरण विवरण बंद करें' : lang === 'te' ? 'దశ వివరాలను మూసివేయండి' : 'Close step details'}
                data-testid="pathway-graph-step-close"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {nodeNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
