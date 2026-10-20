import type { Transition, Variants } from 'framer-motion';

export const tweenFast: Transition = {
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export const tweenMedium: Transition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1],
};

export const springTap: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 28,
  mass: 0.55,
};

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 26,
  mass: 0.8,
};

export const springNav: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.65,
};

export const springPop: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 18,
  mass: 0.45,
};

/** 页面进入 / 退出（带方向） */
export function pageSlideVariants(direction = 1): Variants {
  const enterX = direction * 28;
  const exitX = direction * -20;

  return {
    initial: { opacity: 0, x: enterX },
    animate: {
      opacity: 1,
      x: 0,
      transition: tweenMedium,
    },
    exit: {
      opacity: 0,
      x: exitX,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };
}

/** @deprecated 使用 pageSlideVariants */
export const pageVariants: Variants = pageSlideVariants(1);

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

export const staggerFast: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: tweenFast,
  },
};

export const popIn: Variants = {
  initial: { scale: 0.88, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: springPop },
};

export const slideUpNav: Variants = {
  initial: { y: 72, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: springSoft },
  exit: { y: 48, opacity: 0, transition: tweenFast },
};

export const floatSticker = (delay = 0): Transition => ({
  duration: 4 + delay,
  repeat: Infinity,
  repeatType: 'mirror',
  ease: 'easeInOut',
  delay,
});

export const tapScale = {
  whileTap: { scale: 0.94, transition: springTap },
};

/** @deprecated 使用 tapScale */
export const tapOnly = tapScale;
export const pressable = tapScale;

export const cardMotion = {
  whileHover: { y: -3, transition: springSoft },
  whileTap: { scale: 0.98, transition: springTap },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.97, y: 12, transition: tweenFast },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tweenFast },
  exit: { opacity: 0, transition: tweenFast },
};

export const heartPop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: springPop },
};
