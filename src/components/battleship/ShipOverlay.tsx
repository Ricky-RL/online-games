'use client';

import { motion } from 'framer-motion';
import type { ShipId } from '@/lib/types';
import { FLEET } from '@/lib/battleship-logic';

interface ShipStatusProps {
  sunkShipIds: ShipId[];
  label: string;
}

export function ShipOverlay({ sunkShipIds, label }: ShipStatusProps) {
  return (
    <motion.div
      className="flex flex-col gap-1.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </h4>

      <div className="flex flex-wrap gap-3">
        {FLEET.map((ship) => {
          const isSunk = sunkShipIds.includes(ship.id);

          return (
            <motion.div
              key={ship.id}
              className="flex items-center gap-1.5"
              animate={isSunk ? { opacity: 0.5 } : { opacity: 1 }}
            >
              {/* Ship blocks */}
              <div className="flex gap-0.5">
                {Array.from({ length: ship.size }, (_, i) => (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${
                      isSunk ? 'bg-red-600' : 'bg-emerald-500'
                    }`}
                    animate={
                      isSunk
                        ? { scale: [1, 0.9, 1] }
                        : {}
                    }
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Ship name */}
              <span
                className={`text-xs ${
                  isSunk
                    ? 'text-red-400 line-through'
                    : 'text-text-primary'
                }`}
              >
                {ship.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
