import React from 'react';
import { motion, type Variants } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  strong?: boolean;
  delay?: number;
  onClick?: () => void;
  animateIn?: boolean;
  whileHover?: boolean;
}

const cardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: (custom?: { delay?: number }) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: custom?.delay ?? 0,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
  hover: {
    scale: 1.01,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.45)',
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  strong = false,
  delay = 0,
  onClick,
  animateIn = true,
  whileHover: wh = true,
}) => {
  const baseClasses = strong ? 'glass-card-strong' : 'glass-card';
  const hoverClasses = hover ? 'cursor-pointer' : '';

  return (
    <motion.div
      variants={cardVariants}
      initial={animateIn ? 'initial' : false}
      animate={animateIn ? 'animate' : undefined}
      whileHover={hover && wh ? 'hover' : undefined}
      custom={{ delay }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
