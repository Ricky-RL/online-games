'use client';

import { motion } from 'framer-motion';
import type { ShipDefinition, ShipId } from '@/lib/types';
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
              <ShipBlocks ship={ship} isSunk={isSunk} />

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

function ShipBlocks({ ship, isSunk }: { ship: ShipDefinition; isSunk: boolean }) {
  const colorClass = isSunk ? 'bg-red-600' : 'bg-emerald-500';

  if (!ship.shape) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: ship.size }, (_, i) => (
          <Block key={i} colorClass={colorClass} isSunk={isSunk} />
        ))}
      </div>
    );
  }

  const rows = Math.max(...ship.shape.map(([row]) => row)) + 1;
  const cols = Math.max(...ship.shape.map(([, col]) => col)) + 1;
  const cells = new Set(ship.shape.map(([row, col]) => `${row},${col}`));

  return (
    <div
      className="grid gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${cols}, 0.75rem)`,
        gridTemplateRows: `repeat(${rows}, 0.75rem)`,
      }}
    >
      {Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const hasBlock = cells.has(`${row},${col}`);

        return hasBlock ? (
          <Block key={index} colorClass={colorClass} isSunk={isSunk} />
        ) : (
          <div key={index} className="w-3 h-3" />
        );
      })}
    </div>
  );
}

function Block({ colorClass, isSunk }: { colorClass: string; isSunk: boolean }) {
  return (
    <motion.div
      className={`w-3 h-3 rounded-sm ${colorClass}`}
      animate={isSunk ? { scale: [1, 0.9, 1] } : {}}
      transition={{ duration: 0.3 }}
    />
  );
}
