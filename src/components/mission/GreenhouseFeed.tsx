import { motion } from 'framer-motion';
import type { MarsBase } from './types';
import greenhouseImg from '@/assets/greenhouse-topdown.png';

export function GreenhouseFeed({ base }: { base: MarsBase }) {
  return (
    <div className="panel h-full flex flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-destructive"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-[10px] font-mono text-destructive font-medium tracking-wider">REC</span>
          <span className="text-[9px] text-muted-foreground font-mono ml-1">CAM-01 · MAP</span>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <img
          src={greenhouseImg}
          alt="Greenhouse top-down view"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        />

        {/* Bottom overlay with key metrics */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 pt-6">
          <div className="flex items-end justify-between">
            <div className="flex gap-3">
              {[
                { label: 'TEMP', value: `${base.environment.temperature}°C`, critical: base.environment.temperature < 15 },
                { label: 'CO₂', value: `${base.environment.co2}`, critical: false },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[8px] font-mono text-white/35 tracking-widest">{item.label}</div>
                  <div className={`text-[12px] font-mono font-medium ${item.critical ? 'text-red-400' : 'text-white/70'}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-white/15" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/15" />
        <div className="absolute bottom-12 left-2 w-4 h-4 border-b border-l border-white/15" />
        <div className="absolute bottom-12 right-2 w-4 h-4 border-b border-r border-white/15" />
      </div>
    </div>
  );
}
