import { motion } from 'framer-motion';

export function MarsGlobe() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() > 0.7 ? 2 : 1,
            height: Math.random() > 0.7 ? 2 : 1,
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.3 + (i % 5) * 0.1,
          }}
        />
      ))}

      {/* Mars sphere via CSS */}
      <motion.div
        className="relative"
        style={{ width: '65%', paddingBottom: '65%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 35% 35%, #d4856a 0%, #c4744a 30%, #a85e3a 55%, #8a4a2e 80%, #5a2e1a 100%)
            `,
            boxShadow: `
              inset -20px -10px 40px rgba(0,0,0,0.4),
              inset 10px 10px 30px rgba(255,200,150,0.15),
              0 0 40px rgba(200,120,80,0.2),
              0 0 80px rgba(200,120,80,0.1)
            `,
          }}
        >
          {/* Surface features */}
          <div
            className="absolute rounded-full"
            style={{
              width: '35%', height: '20%',
              left: '25%', top: '40%',
              background: 'rgba(80,40,20,0.3)',
              filter: 'blur(6px)',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '25%', height: '15%',
              left: '55%', top: '55%',
              background: 'rgba(60,30,15,0.25)',
              filter: 'blur(5px)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '20%', height: '12%',
              left: '15%', top: '25%',
              background: 'rgba(210,160,120,0.15)',
              filter: 'blur(4px)',
            }}
          />
          {/* Polar cap */}
          <div
            className="absolute"
            style={{
              width: '30%', height: '8%',
              left: '35%', top: '3%',
              background: 'rgba(220,210,200,0.3)',
              filter: 'blur(5px)',
              borderRadius: '50%',
            }}
          />
          {/* Greenhouse glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 10, height: 10,
              left: '45%', top: '45%',
              background: 'rgba(0,200,80,0.6)',
              boxShadow: '0 0 12px rgba(0,200,80,0.5), 0 0 24px rgba(0,200,80,0.2)',
            }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Atmosphere halo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '68%', paddingBottom: '68%',
          left: '16%', top: '16%',
          background: 'radial-gradient(circle, transparent 70%, rgba(200,120,80,0.08) 85%, transparent 100%)',
        }}
      />
    </div>
  );
}
