import { motion, useReducedMotion } from 'framer-motion';
import { pageSlideVariants } from '../../lib/motion';
import { useRouteDirection } from '../../hooks/useRouteDirection';

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const reduceMotion = useReducedMotion();
  const direction = useRouteDirection();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={pageSlideVariants(direction)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
