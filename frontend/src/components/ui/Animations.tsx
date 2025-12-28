import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useRef } from 'react';
import type { ReactNode } from 'react';

// ============================================
// SPLIT TEXT - Animação letra por letra
// Inspirado em: https://reactbits.dev/
// ============================================
interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  staggerChildren?: number;
}

export const SplitText = ({
  text,
  className = '',
  delay = 0,
  duration = 0.5,
  staggerChildren = 0.03
}: SplitTextProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay,
        staggerChildren,
        delayChildren: delay
      }
    }
  };

  const letterVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(10px)'
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.25, 0.4, 0.25, 1]
      }
    }
  };

  return (
    <motion.span
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      aria-label={text}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          variants={letterVariants}
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

// ============================================
// BLUR TEXT - Texto que aparece com blur
// ============================================
interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export const BlurText = ({
  text,
  className = '',
  delay = 0,
  duration = 0.8
}: BlurTextProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        filter: 'blur(20px)',
        y: 10
      }}
      animate={isInView ? {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
    >
      {text}
    </motion.span>
  );
};

// ============================================
// FADE CONTENT - Fade in suave para conteúdo
// ============================================
interface FadeContentProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  blur?: boolean;
  scale?: number;
}

export const FadeContent = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 30,
  blur = false,
  scale = 1
}: FadeContentProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const getDirectionOffset = () => {
    switch (direction) {
      case 'up': return { y: distance };
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      default: return {};
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...getDirectionOffset(),
        filter: blur ? 'blur(10px)' : 'blur(0px)',
        scale: scale !== 1 ? scale : 1
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        y: 0,
        filter: 'blur(0px)',
        scale: 1
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// STAGGER CONTAINER - Container com stagger
// ============================================
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export const StaggerContainer = ({
  children,
  className = '',
  delay = 0,
  staggerDelay = 0.1
}: StaggerContainerProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay,
        staggerChildren: staggerDelay,
        delayChildren: delay
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// STAGGER ITEM - Item com animação stagger
// ============================================
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = ({ children, className = '' }: StaggerItemProps) => {
  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(5px)'
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1]
      }
    }
  };

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
};

// ============================================
// GRADIENT TEXT - Texto com gradiente animado
// ============================================
interface GradientTextProps {
  text: string;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
}

export const GradientText = ({
  text,
  className = '',
  colors = ['#818cf8', '#c084fc', '#22d3ee', '#818cf8'],
  animationSpeed = 8
}: GradientTextProps) => {
  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: `gradientShift ${animationSpeed}s ease infinite`
      }}
    >
      {text}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </span>
  );
};

// ============================================
// MAGNETIC BUTTON - Botão com efeito magnético
// ============================================
interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticButton = ({
  children,
  className = '',
  strength = 0.3
}: MagneticButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (clientX - left - width / 2) * strength;
    const y = (clientY - top - height / 2) * strength;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0)';
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.3s ease-out' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// SHIMMER BORDER - Borda com efeito shimmer
// ============================================
interface ShimmerBorderProps {
  children: ReactNode;
  className?: string;
  borderColor?: string;
  shimmerColor?: string;
  borderRadius?: string;
  borderWidth?: number;
  duration?: number;
}

export const ShimmerBorder = ({
  children,
  className = '',
  borderColor = 'rgba(99, 102, 241, 0.3)',
  shimmerColor = 'rgba(99, 102, 241, 0.8)',
  borderRadius = '1.5rem',
  borderWidth = 1,
  duration = 3
}: ShimmerBorderProps) => {
  return (
    <div className={`relative ${className}`} style={{ borderRadius }}>
      {/* Shimmer border */}
      <div
        className="absolute inset-0 rounded-inherit"
        style={{
          borderRadius,
          padding: borderWidth,
          background: `linear-gradient(90deg, ${borderColor}, ${shimmerColor}, ${borderColor})`,
          backgroundSize: '200% 100%',
          animation: `shimmer ${duration}s linear infinite`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude'
        }}
      />
      {children}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// PULSE GLOW - Elemento com pulso luminoso
// ============================================
interface PulseGlowProps {
  children: ReactNode;
  className?: string;
  color?: string;
  intensity?: number;
  duration?: number;
}

export const PulseGlow = ({
  children,
  className = '',
  color = 'rgba(99, 102, 241, 0.5)',
  intensity = 20,
  duration = 2
}: PulseGlowProps) => {
  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 ${intensity}px ${color}`,
          `0 0 ${intensity * 2}px ${color}`,
          `0 0 ${intensity}px ${color}`
        ]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};


// ============================================
// FADE IN - Alias para FadeContent (direção up)
// ============================================
interface FadeInProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
}

export const FadeIn = ({
  children,
  className = '',
  duration = 0.6,
  delay = 0
}: FadeInProps) => {
  return (
    <FadeContent
      className={className}
      duration={duration}
      delay={delay}
      direction="up"
    >
      {children}
    </FadeContent>
  );
};

// ============================================
// SLIDE IN - Animação de slide com direção
// ============================================
interface SlideInProps {
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
}

export const SlideIn = ({
  children,
  className = '',
  direction = 'right',
  duration = 0.4,
  delay = 0
}: SlideInProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const getInitialPosition = () => {
    switch (direction) {
      case 'left': return { x: -50, opacity: 0 };
      case 'right': return { x: 50, opacity: 0 };
      case 'up': return { y: -50, opacity: 0 };
      case 'down': return { y: 50, opacity: 0 };
      default: return { x: 50, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialPosition()}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
    >
      {children}
    </motion.div>
  );
};
