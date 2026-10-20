import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { backdropVariants } from '../../lib/motion';
import { UI_ICON_WEIGHT } from '../../lib/icons';

const sheetVariants: Variants = {
  initial: { y: '100%' },
  animate: {
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** 统一的移动端底部抽屉，桌面端自动居中为弹窗 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  bodyClassName,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/40"
            variants={backdropVariants}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx(
              'sheet-panel max-h-[88vh] sm:max-w-lg sm:rounded-[28px]',
              className
            )}
            variants={sheetVariants}
          >
            <div className="sheet-handle sm:hidden" />

            {title && (
              <div className="sheet-header">
                <div className="min-w-0">
                  <h2 className="sheet-title truncate">{title}</h2>
                  {description && (
                    <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="btn-icon !w-8 !h-8"
                >
                  <X size={18} weight={UI_ICON_WEIGHT} />
                </button>
              </div>
            )}

            <div className={clsx('sheet-body', bodyClassName)}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
