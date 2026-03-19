import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChaosButton({ onTrigger, disabled }: { onTrigger: () => void; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (confirming) {
      onTrigger();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={`
        fixed bottom-6 right-6 z-50 text-[11px] font-medium
        border px-4 py-2.5 rounded-md
        transition-colors duration-150
        disabled:opacity-30 disabled:cursor-not-allowed
        ${confirming
          ? 'bg-destructive text-destructive-foreground border-destructive'
          : 'bg-card text-destructive border-destructive/50 hover:bg-destructive/10'
        }
      `}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <AnimatePresence mode="wait">
        {confirming ? (
          <motion.span key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            ⚠ Confirm Chaos
          </motion.span>
        ) : (
          <motion.span key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            ⚠ Activate Chaos
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
