import { motion } from 'framer-motion';
import React, { useState } from 'react';

type SpotlightCardProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

/**
 * SpotlightCard inspirado no React Bits: cria um foco de luz que segue o cursor.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({ className = '', children, onClick }) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(500px at ${coords.x}px ${coords.y}px, rgba(99,102,241,0.15), transparent 50%)`
        }}
      />
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
};

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * TiltCard simples: inclina suavemente no hover.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={`rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg ${className}`}
      whileHover={{ rotateX: -2, rotateY: 2, y: -6 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
    >
      {children}
    </motion.div>
  );
};

type SplitTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

/**
 * SplitText: anima cada letra com leve fade/slide.
 */
export const SplitText: React.FC<SplitTextProps> = ({ text, className = '', delay = 0 }) => {
  const letters = text.split('');
  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {letters.map((letter, idx) => (
        <motion.span
          key={`${letter}-${idx}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + idx * 0.02, duration: 0.25, ease: 'easeOut' }}
          className="inline-block"
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </span>
  );
};
