import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import alphaSymbol from '@assets/alpha-symbol copy_1763141740352.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3100);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          data-testid="splash-screen"
        >
          <div className="relative flex items-center justify-center">
            {/* Animated glow background */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 1],
                opacity: [0, 0.3, 0]
              }}
              transition={{
                duration: 2,
                times: [0, 0.5, 1],
                repeat: Infinity,
                repeatDelay: 0.5
              }}
              className="absolute w-96 h-96 rounded-full bg-primary blur-3xl"
            />

            {/* Main logo animation - starts full screen and shrinks */}
            <motion.div
              initial={{ scale: 12, rotate: -180, opacity: 0 }}
              animate={{ 
                scale: 1, 
                rotate: 0, 
                opacity: 1 
              }}
              transition={{
                duration: 1.2,
                ease: [0.34, 1.56, 0.64, 1],
                opacity: { duration: 0.8 }
              }}
              className="relative z-10"
            >
              <motion.img
                src={alphaSymbol}
                alt="AlphaSource"
                className="w-48 h-48 md:w-64 md:h-64 object-contain"
                animate={{ 
                  filter: [
                    'drop-shadow(0 0 20px rgba(173, 139, 247, 0.5))',
                    'drop-shadow(0 0 40px rgba(173, 139, 247, 0.8))',
                    'drop-shadow(0 0 20px rgba(173, 139, 247, 0.5))'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
                data-testid="splash-logo"
              />
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="absolute -bottom-16 flex flex-col items-center gap-4"
            >
              {/* Animated dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
