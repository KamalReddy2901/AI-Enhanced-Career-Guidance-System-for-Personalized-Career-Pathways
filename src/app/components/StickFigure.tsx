import { MotionConfig, motion, useReducedMotion } from 'motion/react';

export type StickFigurePose =
  | 'waking' | 'walking' | 'sitting' | 'presenting' | 'thinking'
  | 'working' | 'talking' | 'eating' | 'celebrating' | 'tired'
  | 'running' | 'reading' | 'standing' | 'searching' | 'waving'
  | 'coding' | 'coffee' | 'highfive'
  | 'typing' | 'jumping' | 'interviewing' | 'confused'
  | 'climbing' | 'mapping' | 'graduating' | 'pointing';

interface StickFigureProps {
  pose: StickFigurePose;
  size?: number;
  className?: string;
  animate?: boolean;
  animated?: boolean;
}

export function StickFigure({ pose, size = 120, className = '', animate = true, animated }: StickFigureProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = (animated ?? animate) && !reducedMotion;

  return (
    <MotionConfig reducedMotion={shouldAnimate ? 'never' : 'always'}>
      <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      overflow="hidden"
      className={`block shrink-0 ${className}`}
      style={{ overflow: 'hidden' }}
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5 }}
    >
      {renderPose(pose)}
      </motion.svg>
    </MotionConfig>
  );
}

// Shared ground shadow that pulses gently
function GroundShadow({ cx = 60, cy = 110 }: { cx?: number; cy?: number }) {
  return (
    <motion.ellipse initial={false}
      cx={cx}
      cy={cy}
      rx={18}
      ry={3}
      fill="currentColor"
      opacity={0.07}
      animate={{ rx: [18, 21, 18], opacity: [0.07, 0.04, 0.07] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
    />
  );
}

// Subtle breathing on the torso line
function BreathingTorso({
  x1, y1, x2, y2, stroke, strokeWidth,
}: { x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number }) {
  return (
    <motion.line initial={false}
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      animate={{ y2: [y2, y2 + 0.8, y2] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
    />
  );
}

function renderPose(pose: StickFigurePose) {
  const sw = 2.5;
  const s = 'currentColor';

  switch (pose) {

    case 'pointing':
      return <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><GroundShadow/><circle cx="52" cy="23" r="10"/><BreathingTorso x1={52} y1={33} x2={52} y2={70} stroke={s} strokeWidth={sw}/><line x1="52" y1="46" x2="31" y2="62"/><motion.line initial={false} x1="52" y1="45" x2="92" y2="36" animate={{x2:[90,94,90]}} transition={{repeat:Infinity,duration:2}}/><line x1="52" y1="70" x2="40" y2="101"/><line x1="52" y1="70" x2="67" y2="101"/><path d="M92 36l-7-4m7 4-5 7"/></g>;

    case 'climbing':
      return <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M78 105V25M104 105V25M78 40h26M78 58h26M78 76h26M78 94h26" opacity=".45"/><circle cx="54" cy="33" r="9"/><line x1="54" y1="42" x2="61" y2="70"/><motion.line initial={false} x1="59" y1="50" x2="82" y2="42" animate={{y2:[42,39,42]}} transition={{repeat:Infinity,duration:2}}/><line x1="58" y1="51" x2="40" y2="60"/><motion.line initial={false} x1="61" y1="70" x2="82" y2="78" animate={{y2:[78,74,78]}} transition={{repeat:Infinity,duration:2}}/><line x1="61" y1="70" x2="46" y2="96"/></g>;

    case 'mapping':
      return <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><GroundShadow/><circle cx="60" cy="22" r="10"/><line x1="60" y1="32" x2="60" y2="65"/><line x1="60" y1="65" x2="48" y2="99"/><line x1="60" y1="65" x2="73" y2="99"/><motion.path d="M22 50l24-7 27 7 25-8v28l-25 8-27-7-24 7zM46 43v28M73 50v28" fill="#f9f8f7" animate={{rotate:[-1,1,-1]}} transition={{repeat:Infinity,duration:3}}/><line x1="60" y1="45" x2="44" y2="54"/><line x1="60" y1="45" x2="76" y2="55"/></g>;

    case 'graduating':
      return <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><GroundShadow/><circle cx="60" cy="30" r="10"/><path d="M43 19l17-8 18 8-18 8zM74 21v12"/><line x1="60" y1="40" x2="60" y2="72"/><motion.line initial={false} x1="60" y1="49" x2="36" y2="34" animate={{y2:[34,29,34]}} transition={{repeat:Infinity,duration:2}}/><motion.line initial={false} x1="60" y1="49" x2="84" y2="34" animate={{y2:[34,29,34]}} transition={{repeat:Infinity,duration:2}}/><line x1="60" y1="72" x2="47" y2="102"/><line x1="60" y1="72" x2="74" y2="102"/><motion.path d="M91 21l9-7 7 7-9 7z" animate={{y:[0,-6,0],rotate:[0,12,0]}} transition={{repeat:Infinity,duration:2}}/></g>;

    case 'standing':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false}
            cx="60" cy="22" r="10"
            animate={{ cy: [22, 21.5, 22] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          />
          <BreathingTorso x1={60} y1={32} x2={60} y2={70} stroke={s} strokeWidth={sw} />
          <line x1="60" y1="45" x2="40" y2="62" />
          <line x1="60" y1="45" x2="80" y2="62" />
          <line x1="60" y1="70" x2="45" y2="100" />
          <line x1="60" y1="70" x2="75" y2="100" />
        </g>
      );

    case 'waking':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <rect x="15" y="65" width="90" height="8" rx="3" fill="none" />
          <line x1="15" y1="73" x2="15" y2="105" />
          <line x1="105" y1="73" x2="105" y2="105" />
          <circle cx="45" cy="42" r="10" />
          <line x1="45" y1="52" x2="55" y2="65" />
          <motion.line initial={false} x1="45" y1="55" x2="28" y2="36"
            animate={{ x2: [28, 23, 28], y2: [36, 31, 36] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }} />
          <motion.line initial={false} x1="45" y1="55" x2="62" y2="36"
            animate={{ x2: [62, 67, 62], y2: [36, 31, 36] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.1 }} />
          <line x1="55" y1="65" x2="75" y2="65" />
          <line x1="55" y1="65" x2="78" y2="62" />
          <motion.text x="70" y="32" fontSize="11" fill={s} strokeWidth={0}
            animate={{ opacity: [1, 0.2, 1], y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}>Z</motion.text>
          <motion.text x="81" y="22" fontSize="8" fill={s} strokeWidth={0}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>z</motion.text>
          <motion.text x="89" y="15" fontSize="6" fill={s} strokeWidth={0}
            animate={{ opacity: [0.2, 0.7, 0.2], y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 1.2 }}>z</motion.text>
        </g>
      );

    case 'walking':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cx: [60, 60.5, 60] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <line x1="60" y1="32" x2="60" y2="70" />
          <motion.line initial={false} x1="60" y1="45" x2="42" y2="60"
            animate={{ x2: [42, 50, 42], y2: [60, 52, 60] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.line initial={false} x1="60" y1="45" x2="78" y2="52"
            animate={{ x2: [78, 70, 78], y2: [52, 60, 52] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.line initial={false} x1="60" y1="70" x2="42" y2="100"
            animate={{ x2: [42, 52, 42] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.line initial={false} x1="60" y1="70" x2="78" y2="100"
            animate={{ x2: [78, 68, 78] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <rect x="78" y="50" width="12" height="10" rx="2" fill="none" />
          <line x1="82" y1="50" x2="82" y2="48" />
          <line x1="86" y1="50" x2="86" y2="48" />
          <line x1="82" y1="48" x2="86" y2="48" />
          <motion.circle initial={false} cx="22" cy="104" r="1.5" fill={s}
            animate={{ opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0 }} />
          <motion.circle initial={false} cx="30" cy="106" r="1.5" fill={s}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0.4 }} />
          <motion.circle initial={false} cx="38" cy="104" r="1.5" fill={s}
            animate={{ opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0.8 }} />
        </g>
      );

    case 'sitting':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="22" r="10" />
          <line x1="60" y1="32" x2="60" y2="62" />
          <line x1="60" y1="45" x2="42" y2="55" />
          <line x1="60" y1="45" x2="78" y2="55" />
          <line x1="60" y1="62" x2="45" y2="75" />
          <line x1="45" y1="75" x2="45" y2="100" />
          <line x1="60" y1="62" x2="75" y2="75" />
          <line x1="75" y1="75" x2="75" y2="100" />
          <line x1="35" y1="62" x2="85" y2="62" />
          <line x1="38" y1="62" x2="38" y2="100" />
          <line x1="82" y1="62" x2="82" y2="100" />
          <line x1="85" y1="30" x2="85" y2="62" />
        </g>
      );

    case 'presenting':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={35} cy={110} />
          <motion.circle initial={false} cx="35" cy="25" r="10"
            animate={{ cy: [25, 24.5, 25] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} />
          <line x1="35" y1="35" x2="35" y2="70" />
          <motion.line initial={false} x1="35" y1="48" x2="55" y2="30"
            animate={{ x2: [55, 59, 55], y2: [30, 27, 30] }}
            transition={{ repeat: Infinity, duration: 2 }} />
          <line x1="35" y1="48" x2="18" y2="57" />
          <line x1="35" y1="70" x2="22" y2="100" />
          <line x1="35" y1="70" x2="48" y2="100" />
          <rect x="55" y="10" width="58" height="46" rx="2" fill="none" />
          <line x1="62" y1="22" x2="103" y2="22" strokeWidth={1.5} />
          <line x1="62" y1="30" x2="98" y2="30" strokeWidth={1.5} />
          <line x1="62" y1="38" x2="90" y2="38" strokeWidth={1.5} />
          <line x1="62" y1="46" x2="95" y2="46" strokeWidth={1.5} />
          <motion.circle initial={false} cx="62" cy="22" r="2" fill={s}
            animate={{ cx: [62, 92, 62] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} />
          <circle cx="14" cy="95" r="3" fill="none" />
          <circle cx="24" cy="100" r="3" fill="none" />
          <circle cx="6" cy="100" r="3" fill="none" />
        </g>
      );

    case 'thinking':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="28" r="10"
            animate={{ cy: [28, 27.5, 28] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} />
          <BreathingTorso x1={60} y1={38} x2={60} y2={72} stroke={s} strokeWidth={sw} />
          <line x1="60" y1="50" x2="48" y2="62" />
          <motion.line initial={false} x1="60" y1="50" x2="68" y2="32"
            animate={{ y2: [32, 29, 32] }}
            transition={{ repeat: Infinity, duration: 2.5 }} />
          <line x1="60" y1="72" x2="48" y2="100" />
          <line x1="60" y1="72" x2="72" y2="100" />
          <motion.circle initial={false} cx="78" cy="18" r="2" fill={s}
            animate={{ cy: [18, 14, 18], opacity: [0.6, 0.2, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.5 }} />
          <motion.circle initial={false} cx="84" cy="11" r="3" fill={s}
            animate={{ cy: [11, 7, 11], opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.3 }} />
          <motion.ellipse initial={false} cx="97" cy="9" rx="14" ry="9" fill="none"
            animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.6 }} />
          <motion.g animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.6 }}>
            <text x="89" y="13" fontSize="9" fill={s} strokeWidth={0}>?</text>
          </motion.g>
          <motion.circle initial={false} cx="72" cy="14" r="1.5" fill={s}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, delay: 1.2 }} />
        </g>
      );

    case 'working':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <motion.circle initial={false} cx="50" cy="22" r="10"
            animate={{ cy: [22, 21.5, 22] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} />
          <line x1="50" y1="32" x2="50" y2="62" />
          <motion.line initial={false} x1="50" y1="48" x2="35" y2="60"
            animate={{ y2: [60, 57, 60] }}
            transition={{ repeat: Infinity, duration: 0.45 }} />
          <motion.line initial={false} x1="50" y1="48" x2="65" y2="60"
            animate={{ y2: [57, 60, 57] }}
            transition={{ repeat: Infinity, duration: 0.45 }} />
          <line x1="50" y1="62" x2="38" y2="78" />
          <line x1="38" y1="78" x2="38" y2="100" />
          <line x1="50" y1="62" x2="62" y2="78" />
          <line x1="62" y1="78" x2="62" y2="100" />
          <line x1="18" y1="62" x2="98" y2="62" />
          <line x1="20" y1="62" x2="20" y2="100" />
          <line x1="96" y1="62" x2="96" y2="100" />
          <rect x="68" y="33" width="24" height="20" rx="2" fill="none" />
          <line x1="80" y1="53" x2="80" y2="62" />
          <motion.rect x="70" y="35" width="20" height="16" rx="1" fill={s} opacity={0.05}
            animate={{ opacity: [0.05, 0.12, 0.05] }}
            transition={{ repeat: Infinity, duration: 3 }} />
          <motion.text x="71" y="32" fontSize="6" fill={s} strokeWidth={0}
            animate={{ y: [32, 26, 20], opacity: [0.6, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0 }}>{'{}'}</motion.text>
          <motion.text x="82" y="30" fontSize="6" fill={s} strokeWidth={0}
            animate={{ y: [30, 24, 18], opacity: [0.6, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.8 }}>{'<>'}</motion.text>
          <motion.text x="77" y="28" fontSize="5" fill={s} strokeWidth={0}
            animate={{ y: [28, 22, 16], opacity: [0.5, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 1.6 }}>01</motion.text>
        </g>
      );

    case 'talking':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={35} cy={108} />
          <GroundShadow cx={85} cy={108} />
          <circle cx="35" cy="25" r="10" />
          <line x1="35" y1="35" x2="35" y2="68" />
          <motion.line initial={false} x1="35" y1="48" x2="50" y2="40"
            animate={{ y2: [40, 37, 40] }}
            transition={{ repeat: Infinity, duration: 1.5 }} />
          <line x1="35" y1="48" x2="20" y2="57" />
          <line x1="35" y1="68" x2="25" y2="100" />
          <line x1="35" y1="68" x2="45" y2="100" />
          <circle cx="85" cy="25" r="10" />
          <line x1="85" y1="35" x2="85" y2="68" />
          <line x1="85" y1="48" x2="70" y2="42" />
          <motion.line initial={false} x1="85" y1="48" x2="100" y2="57"
            animate={{ y2: [57, 54, 57] }}
            transition={{ repeat: Infinity, duration: 1.5 }} />
          <line x1="85" y1="68" x2="75" y2="100" />
          <line x1="85" y1="68" x2="95" y2="100" />
          <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            <line x1="52" y1="30" x2="57" y2="30" strokeWidth={1.5} />
            <line x1="53" y1="35" x2="59" y2="35" strokeWidth={1.5} />
            <line x1="52" y1="40" x2="56" y2="40" strokeWidth={1.5} />
          </motion.g>
        </g>
      );

    case 'eating':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="22" r="10" />
          <line x1="50" y1="32" x2="50" y2="62" />
          <motion.line initial={false} x1="50" y1="48" x2="58" y2="27"
            animate={{ y2: [27, 30, 27] }}
            transition={{ repeat: Infinity, duration: 1.8 }} />
          <line x1="50" y1="48" x2="35" y2="57" />
          <line x1="50" y1="62" x2="40" y2="78" />
          <line x1="40" y1="78" x2="40" y2="100" />
          <line x1="50" y1="62" x2="60" y2="78" />
          <line x1="60" y1="78" x2="60" y2="100" />
          <line x1="15" y1="62" x2="105" y2="62" />
          <line x1="18" y1="62" x2="18" y2="100" />
          <line x1="102" y1="62" x2="102" y2="100" />
          <ellipse cx="82" cy="57" rx="13" ry="4" fill="none" />
          <circle cx="80" cy="54" r="2" fill={s} opacity={0.3} />
          <circle cx="85" cy="55" r="1.5" fill={s} opacity={0.3} />
          <rect x="26" y="50" width="8" height="10" rx="2" fill="none" />
          <path d="M 34 52 Q 38 52 38 56 Q 38 60 34 60" fill="none" />
          <motion.path d="M 28 48 Q 31 44 28 40" fill="none" strokeWidth={1}
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }} />
          <motion.path d="M 32 48 Q 35 44 32 40" fill="none" strokeWidth={1}
            animate={{ opacity: [0.9, 0.3, 0.9] }}
            transition={{ repeat: Infinity, duration: 2 }} />
        </g>
      );

    case 'celebrating':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cy: [22, 19, 22] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <line x1="60" y1="32" x2="60" y2="68" />
          <motion.line initial={false} x1="60" y1="45" x2="35" y2="18"
            animate={{ x2: [35, 31, 35], y2: [18, 13, 18] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.line initial={false} x1="60" y1="45" x2="85" y2="18"
            animate={{ x2: [85, 89, 85], y2: [18, 13, 18] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0.1 }} />
          <line x1="60" y1="68" x2="42" y2="100" />
          <line x1="60" y1="68" x2="78" y2="100" />
          <path d="M 54 25 Q 60 32 66 25" fill="none" strokeWidth={2} />
          {[
            { cx: 25, cy: 12, r: 2.5, delay: 0, dur: 1.3 },
            { cx: 95, cy: 10, r: 2, delay: 0.2, dur: 1.1 },
            { cx: 40, cy: 8, r: 1.5, delay: 0.5, dur: 1.5 },
            { cx: 80, cy: 9, r: 2, delay: 0.7, dur: 1.2 },
            { cx: 15, cy: 18, r: 1.5, delay: 0.3, dur: 1.6 },
            { cx: 105, cy: 16, r: 2, delay: 0.9, dur: 1.4 },
          ].map((c, i) => (
            <motion.circle initial={false} key={i} cx={c.cx} cy={c.cy} r={c.r} fill={s} opacity={0.6}
              animate={{ y: [0, 10, 0], opacity: [0.6, 0.15, 0.6] }}
              transition={{ repeat: Infinity, duration: c.dur, delay: c.delay }} />
          ))}
          {[
            { x: 18, y: 24, delay: 0.4, dur: 1.7 },
            { x: 95, y: 22, delay: 0.1, dur: 1.4 },
            { x: 30, y: 6, delay: 0.8, dur: 1.2 },
            { x: 88, y: 5, delay: 0.6, dur: 1.5 },
          ].map((r, i) => (
            <motion.rect key={i + 10} x={r.x} y={r.y} width="4" height="3" fill={s} opacity={0.5}
              animate={{ y: [0, 9, 0], rotate: [0, 200, 400] }}
              transition={{ repeat: Infinity, duration: r.dur, delay: r.delay }} />
          ))}
        </g>
      );

    case 'tired':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <circle cx="60" cy="28" r="10" />
          <line x1="60" y1="38" x2="60" y2="72" />
          <line x1="60" y1="50" x2="42" y2="70" />
          <line x1="60" y1="50" x2="78" y2="70" />
          <line x1="60" y1="72" x2="48" y2="100" />
          <line x1="60" y1="72" x2="72" y2="100" />
          <line x1="54" y1="26" x2="58" y2="26" strokeWidth={2.5} />
          <line x1="62" y1="26" x2="66" y2="26" strokeWidth={2.5} />
          <path d="M 56 33 Q 60 30 64 33" fill="none" strokeWidth={1.5} />
          <motion.g animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
            transition={{ repeat: Infinity, duration: 3 }}>
            <text x="77" y="20" fontSize="11" fill={s} strokeWidth={0}>Z</text>
            <text x="88" y="13" fontSize="8" fill={s} strokeWidth={0}>z</text>
            <text x="95" y="8" fontSize="5" fill={s} strokeWidth={0}>z</text>
          </motion.g>
        </g>
      );

    case 'running':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={60} cy={108} />
          <motion.g animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 0.35 }}>
            <motion.circle initial={false} cx="55" cy="20" r="10"
              animate={{ cy: [20, 18, 20] }}
              transition={{ repeat: Infinity, duration: 0.35 }} />
            <line x1="55" y1="30" x2="60" y2="62" />
            <motion.line initial={false} x1="58" y1="42" x2="40" y2="30"
              animate={{ x2: [40, 48, 40], y2: [30, 38, 30] }}
              transition={{ repeat: Infinity, duration: 0.35 }} />
            <motion.line initial={false} x1="58" y1="42" x2="77" y2="38"
              animate={{ x2: [77, 68, 77], y2: [38, 30, 38] }}
              transition={{ repeat: Infinity, duration: 0.35 }} />
            <motion.line initial={false} x1="60" y1="62" x2="37" y2="92"
              animate={{ x2: [37, 55, 37] }}
              transition={{ repeat: Infinity, duration: 0.35 }} />
            <motion.line initial={false} x1="60" y1="62" x2="82" y2="92"
              animate={{ x2: [82, 62, 82] }}
              transition={{ repeat: Infinity, duration: 0.35 }} />
          </motion.g>
          <motion.g animate={{ opacity: [0.5, 0.15, 0.5], x: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 0.35 }}>
            <line x1="14" y1="28" x2="26" y2="28" strokeWidth={1.5} />
            <line x1="10" y1="38" x2="24" y2="38" strokeWidth={1.5} />
            <line x1="12" y1="48" x2="22" y2="48" strokeWidth={1.5} />
            <line x1="16" y1="58" x2="24" y2="58" strokeWidth={1} />
          </motion.g>
        </g>
      );

    case 'reading':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cy: [22, 23, 22] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} />
          <BreathingTorso x1={60} y1={32} x2={60} y2={70} stroke={s} strokeWidth={sw} />
          <line x1="60" y1="48" x2="45" y2="52" />
          <line x1="60" y1="48" x2="75" y2="52" />
          <path d="M 42 46 L 42 66 L 60 63 L 78 66 L 78 46 L 60 43 Z" fill="none" />
          <line x1="60" y1="43" x2="60" y2="63" />
          <line x1="47" y1="51" x2="56" y2="50" strokeWidth={0.9} />
          <line x1="47" y1="55" x2="55" y2="54" strokeWidth={0.9} />
          <line x1="47" y1="59" x2="54" y2="58" strokeWidth={0.9} />
          <line x1="64" y1="50" x2="73" y2="51" strokeWidth={0.9} />
          <line x1="64" y1="54" x2="72" y2="55" strokeWidth={0.9} />
          <line x1="64" y1="58" x2="71" y2="59" strokeWidth={0.9} />
          <motion.path d="M 60 43 Q 65 50 60 63"
            fill="none" strokeWidth={1} opacity={0.3}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, delay: 1 }} />
          <line x1="60" y1="70" x2="48" y2="100" />
          <line x1="60" y1="70" x2="72" y2="100" />
        </g>
      );

    case 'searching':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={50} cy={108} />
          <circle cx="50" cy="30" r="10" />
          <line x1="50" y1="40" x2="50" y2="72" />
          <line x1="50" y1="52" x2="35" y2="62" />
          <motion.line initial={false} x1="50" y1="52" x2="72" y2="37"
            animate={{ x2: [72, 79, 72], y2: [37, 33, 37] }}
            transition={{ repeat: Infinity, duration: 2 }} />
          <line x1="50" y1="72" x2="38" y2="100" />
          <line x1="50" y1="72" x2="62" y2="100" />
          <motion.g animate={{ x: [0, 6, 0], y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}>
            <circle cx="82" cy="24" r="13" fill="none" strokeWidth={2.5} />
            <line x1="92" y1="33" x2="102" y2="43" strokeWidth={3} />
          </motion.g>
          <motion.circle initial={false} cx="82" cy="24" r="16" fill="none" strokeWidth={0.8}
            animate={{ r: [16, 24, 16], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }} />
          <motion.circle initial={false} cx="82" cy="24" r="20" fill="none" strokeWidth={0.6}
            animate={{ r: [20, 30, 20], opacity: [0.15, 0, 0.15] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} />
        </g>
      );

    case 'waving':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cy: [22, 21, 22] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} />
          <BreathingTorso x1={60} y1={32} x2={60} y2={70} stroke={s} strokeWidth={sw} />
          <motion.line initial={false} x1="60" y1="45" x2="82" y2="22"
            animate={{ x2: [82, 86, 82], y2: [22, 17, 22] }}
            transition={{ repeat: Infinity, duration: 0.55 }} />
          <line x1="60" y1="45" x2="40" y2="60" />
          <line x1="60" y1="70" x2="48" y2="100" />
          <line x1="60" y1="70" x2="72" y2="100" />
          <motion.g animate={{ rotate: [-15, 15, -15] }}
            transition={{ repeat: Infinity, duration: 0.55 }}
            style={{ transformOrigin: '82px 22px' }}>
            <line x1="82" y1="18" x2="85" y2="13" strokeWidth={1.5} />
            <line x1="82" y1="18" x2="89" y2="16" strokeWidth={1.5} />
            <line x1="82" y1="18" x2="89" y2="21" strokeWidth={1.5} />
            <line x1="82" y1="18" x2="87" y2="25" strokeWidth={1.5} />
          </motion.g>
          <path d="M 55 25 Q 60 31 65 25" fill="none" strokeWidth={2} />
        </g>
      );

    // ── New poses ──────────────────────────────────────────────

    case 'coding':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <motion.circle initial={false} cx="50" cy="20" r="10"
            animate={{ cy: [20, 19.5, 20] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
          <line x1="50" y1="30" x2="52" y2="62" />
          <motion.line initial={false} x1="51" y1="46" x2="33" y2="58"
            animate={{ y2: [58, 55, 58] }}
            transition={{ repeat: Infinity, duration: 0.4 }} />
          <motion.line initial={false} x1="51" y1="46" x2="67" y2="58"
            animate={{ y2: [55, 58, 55] }}
            transition={{ repeat: Infinity, duration: 0.4 }} />
          <line x1="52" y1="62" x2="40" y2="78" />
          <line x1="40" y1="78" x2="40" y2="100" />
          <line x1="52" y1="62" x2="64" y2="78" />
          <line x1="64" y1="78" x2="64" y2="100" />
          <line x1="16" y1="62" x2="100" y2="62" />
          <line x1="18" y1="62" x2="18" y2="100" />
          <line x1="98" y1="62" x2="98" y2="100" />
          <rect x="66" y="28" width="30" height="24" rx="2" fill="none" />
          <line x1="81" y1="52" x2="81" y2="62" />
          <motion.g animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <line x1="70" y1="34" x2="88" y2="34" strokeWidth={1} />
            <line x1="70" y1="38" x2="84" y2="38" strokeWidth={1} />
            <line x1="72" y1="42" x2="90" y2="42" strokeWidth={1} />
            <line x1="72" y1="46" x2="82" y2="46" strokeWidth={1} />
          </motion.g>
          <motion.line initial={false} x1="84" y1="46" x2="84" y2="48" strokeWidth={1.5}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
          <motion.text x="66" y="26" fontSize="6" fill={s} strokeWidth={0}
            animate={{ y: [26, 20, 14], opacity: [0.7, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: 0 }}>{'</>'}</motion.text>
          <motion.text x="74" y="24" fontSize="5" fill={s} strokeWidth={0}
            animate={{ y: [24, 18, 12], opacity: [0.5, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: 1.2 }}>fn()</motion.text>
        </g>
      );

    case 'coffee':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cy: [22, 21.5, 22] }}
            transition={{ repeat: Infinity, duration: 4 }} />
          <BreathingTorso x1={60} y1={32} x2={60} y2={70} stroke={s} strokeWidth={sw} />
          <motion.line initial={false} x1="60" y1="48" x2="75" y2="42"
            animate={{ y2: [42, 40, 42] }}
            transition={{ repeat: Infinity, duration: 3 }} />
          <line x1="60" y1="48" x2="42" y2="58" />
          <line x1="60" y1="70" x2="48" y2="100" />
          <line x1="60" y1="70" x2="72" y2="100" />
          <motion.g animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <rect x="73" y="35" width="12" height="13" rx="2" fill="none" />
            <path d="M 85 38 Q 90 38 90 43 Q 90 48 85 48" fill="none" />
            <motion.path d="M 76 33 Q 79 28 76 23" fill="none" strokeWidth={1}
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.8 }} />
            <motion.path d="M 80 33 Q 83 28 80 23" fill="none" strokeWidth={1}
              animate={{ opacity: [0.9, 0.2, 0.9] }}
              transition={{ repeat: Infinity, duration: 1.8 }} />
            <motion.path d="M 84 33 Q 87 28 84 23" fill="none" strokeWidth={1}
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.4 }} />
          </motion.g>
          <path d="M 55 26 Q 60 31 65 26" fill="none" strokeWidth={1.5} />
        </g>
      );

    case 'highfive':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={30} cy={108} />
          <GroundShadow cx={90} cy={108} />
          <circle cx="30" cy="28" r="10" />
          <line x1="30" y1="38" x2="30" y2="72" />
          <line x1="30" y1="52" x2="16" y2="60" />
          <motion.line initial={false} x1="30" y1="52" x2="55" y2="32"
            animate={{ x2: [55, 57, 55] }}
            transition={{ repeat: Infinity, duration: 0.5 }} />
          <line x1="30" y1="72" x2="18" y2="100" />
          <line x1="30" y1="72" x2="42" y2="100" />
          <circle cx="90" cy="28" r="10" />
          <line x1="90" y1="38" x2="90" y2="72" />
          <line x1="90" y1="52" x2="104" y2="60" />
          <motion.line initial={false} x1="90" y1="52" x2="65" y2="32"
            animate={{ x2: [65, 63, 65] }}
            transition={{ repeat: Infinity, duration: 0.5 }} />
          <line x1="90" y1="72" x2="78" y2="100" />
          <line x1="90" y1="72" x2="102" y2="100" />
          <motion.g animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            style={{ transformOrigin: '60px 32px' }}>
            <line x1="60" y1="24" x2="60" y2="40" strokeWidth={2} />
            <line x1="52" y1="32" x2="68" y2="32" strokeWidth={2} />
            <line x1="54" y1="26" x2="66" y2="38" strokeWidth={1.5} />
            <line x1="66" y1="26" x2="54" y2="38" strokeWidth={1.5} />
          </motion.g>
          <path d="M 25 30 Q 30 35 35 30" fill="none" strokeWidth={1.5} />
          <path d="M 85 30 Q 90 35 95 30" fill="none" strokeWidth={1.5} />
        </g>
      );

    // TYPING — figure seated at keyboard, fingers bouncing rapidly
    case 'typing':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={60} cy={112} />
          <circle cx="60" cy="20" r="10" />
          <line x1="60" y1="30" x2="60" y2="64" />
          {/* Left arm bouncing to keyboard */}
          <motion.line initial={false} x1="60" y1="44" x2="43" y2="72"
            animate={{ y2: [72, 70, 74, 71, 72] }}
            transition={{ repeat: Infinity, duration: 0.4, ease: 'linear' }} />
          {/* Right arm bouncing to keyboard */}
          <motion.line initial={false} x1="60" y1="44" x2="77" y2="72"
            animate={{ y2: [72, 74, 70, 73, 72] }}
            transition={{ repeat: Infinity, duration: 0.4, ease: 'linear', delay: 0.1 }} />
          {/* Keyboard */}
          <rect x="30" y="75" width="60" height="8" rx="2" strokeWidth={1.5} />
          <line x1="38" y1="79" x2="82" y2="79" strokeWidth={1} />
          {/* Seated legs */}
          <line x1="55" y1="64" x2="44" y2="84" />
          <line x1="65" y1="64" x2="76" y2="84" />
          <line x1="44" y1="84" x2="44" y2="100" />
          <line x1="76" y1="84" x2="76" y2="100" />
          {/* Concentration dot */}
          <motion.circle initial={false} cx="60" cy="7" r="2" fill={s} stroke="none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 0.8 }} />
        </g>
      );

    // JUMPING — figure leaping with arms and legs spread wide
    case 'jumping':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow cx={60} cy={116} />
          <motion.g
            animate={{ y: [0, -14, 0] }}
            transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
          >
            <circle cx="60" cy="22" r="10" />
            <line x1="60" y1="32" x2="60" y2="66" />
            {/* Arms flung wide up */}
            <line x1="60" y1="46" x2="34" y2="34" />
            <line x1="60" y1="46" x2="86" y2="34" />
            {/* Legs spread mid-jump */}
            <line x1="60" y1="66" x2="40" y2="88" />
            <line x1="60" y1="66" x2="80" y2="88" />
          </motion.g>
          {/* Energy sparkles */}
          <motion.circle initial={false} cx="22" cy="56" r="3" fill={s} stroke="none"
            animate={{ opacity: [0, 1, 0], r: [1.5, 3, 1.5] }}
            transition={{ repeat: Infinity, duration: 0.65, delay: 0.2 }} />
          <motion.circle initial={false} cx="98" cy="56" r="3" fill={s} stroke="none"
            animate={{ opacity: [0, 1, 0], r: [1.5, 3, 1.5] }}
            transition={{ repeat: Infinity, duration: 0.65, delay: 0.4 }} />
        </g>
      );

    // INTERVIEWING — formal standing with briefcase, composed posture
    case 'interviewing':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <motion.circle initial={false} cx="60" cy="22" r="10"
            animate={{ cy: [22, 21.5, 22] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} />
          <BreathingTorso x1={60} y1={32} x2={60} y2={70} stroke={s} strokeWidth={sw} />
          {/* Left arm holding briefcase */}
          <line x1="60" y1="46" x2="40" y2="66" />
          {/* Briefcase */}
          <rect x="26" y="64" width="20" height="14" rx="2" strokeWidth={2} />
          <line x1="31" y1="64" x2="31" y2="60" strokeWidth={1.5} />
          <line x1="41" y1="64" x2="41" y2="60" strokeWidth={1.5} />
          <line x1="31" y1="60" x2="41" y2="60" strokeWidth={1.5} />
          <line x1="36" y1="68" x2="36" y2="72" strokeWidth={1.5} />
          {/* Right arm slightly extended in greeting gesture */}
          <motion.line initial={false} x1="60" y1="46" x2="80" y2="60"
            animate={{ x2: [80, 82, 80], y2: [60, 58, 60] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
          {/* Professional upright legs */}
          <line x1="60" y1="70" x2="52" y2="100" />
          <line x1="60" y1="70" x2="68" y2="100" />
        </g>
      );

    // CONFUSED — head tilting, hand on head, question mark
    case 'confused':
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          {/* Tilting head */}
          <motion.g
            animate={{ rotate: [0, 14, 7, 14, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{ transformOrigin: '60px 32px' }}
          >
            <circle cx="60" cy="22" r="10" />
          </motion.g>
          <line x1="60" y1="32" x2="60" y2="70" />
          {/* Left arm hanging naturally */}
          <line x1="60" y1="46" x2="42" y2="65" />
          {/* Right arm raised to head — scratching */}
          <motion.line initial={false} x1="60" y1="46" x2="76" y2="26"
            animate={{ x2: [76, 78, 74, 76], y2: [26, 24, 28, 26] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }} />
          {/* Question mark */}
          <motion.text x="80" y="24" fontSize="16" fill="currentColor" stroke="none"
            fontFamily="serif" fontWeight="bold"
            animate={{ opacity: [0.4, 1, 0.4], y: [24, 21, 24] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          >?</motion.text>
          {/* Legs */}
          <line x1="60" y1="70" x2="50" y2="100" />
          <line x1="60" y1="70" x2="70" y2="100" />
        </g>
      );

    default:
      return (
        <g stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <GroundShadow />
          <circle cx="60" cy="22" r="10" />
          <line x1="60" y1="32" x2="60" y2="70" />
          <line x1="60" y1="45" x2="40" y2="62" />
          <line x1="60" y1="45" x2="80" y2="62" />
          <line x1="60" y1="70" x2="45" y2="100" />
          <line x1="60" y1="70" x2="75" y2="100" />
        </g>
      );
  }
}
