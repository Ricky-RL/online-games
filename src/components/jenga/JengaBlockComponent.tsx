'use client';

interface JengaBlockComponentProps {
  row: number;
  col: number;
  exists: boolean;
  risk: number;
  isPlayable: boolean;
  isSelected: boolean;
  blockLength: number;
  blockWidth: number;
  blockHeight: number;
  isPerp: boolean;
  onClick: () => void;
}

function woodColor(risk: number): { front: string; side: string; top: string; dark: string } {
  if (risk < 15) return { front: '#d4a574', side: '#b08050', top: '#e8c9a0', dark: '#8a6038' };
  if (risk < 30) return { front: '#c99a5f', side: '#a06b38', top: '#e0ba85', dark: '#7a5528' };
  if (risk < 50) return { front: '#e8a849', side: '#b87a28', top: '#f5c96e', dark: '#8a5a18' };
  return { front: '#d45a3a', side: '#a03020', top: '#e87060', dark: '#702018' };
}

export function JengaBlockComponent({
  exists,
  risk,
  isPlayable,
  isSelected,
  blockLength,
  blockWidth,
  blockHeight,
  isPerp,
  onClick,
}: JengaBlockComponentProps) {
  if (!exists) {
    return <div style={{ width: `${blockWidth}px`, height: `${blockHeight}px` }} />;
  }

  const colors = woodColor(risk);

  // Each block in the 2D layout takes up blockWidth x blockHeight in the flex row.
  // The 3D cuboid is blockLength (long) x blockHeight (tall) x blockWidth (deep).
  // Even rows: long axis runs into Z (depth), short axis along X (flex direction).
  // Odd rows: long axis runs along X, short axis into Z.
  // We rotate the individual block to achieve cross-hatch.

  const W = blockLength; // cuboid X dimension
  const H = blockHeight; // cuboid Y dimension
  const D = blockWidth;  // cuboid Z dimension

  const hw = W / 2;
  const hh = H / 2;
  const hd = D / 2;

  const faceBase: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    pointerEvents: 'none',
  };

  const blockTransform = isPerp
    ? 'rotateY(90deg)' // perpendicular row: rotate block so long axis goes into screen
    : 'rotateY(0deg)'; // even row: long axis visible facing viewer

  return (
    <button
      data-block
      onClick={isPlayable ? onClick : undefined}
      className="relative"
      style={{
        width: `${blockWidth}px`,
        height: `${blockHeight}px`,
        transformStyle: 'preserve-3d',
        transform: blockTransform,
        transition: 'transform 0.15s ease',
        cursor: isPlayable ? 'pointer' : 'default',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        if (isPlayable) {
          const base = isPerp ? 'rotateY(90deg)' : 'rotateY(0deg)';
          (e.currentTarget as HTMLElement).style.transform = `${base} translateZ(6px)`;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = blockTransform;
      }}
    >
      {/* Front face */}
      <div
        style={{
          ...faceBase,
          width: `${W}px`,
          height: `${H}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.front,
          transform: `translateZ(${hd}px)`,
          border: isSelected ? '2px solid #fff' : '1px solid rgba(0,0,0,0.12)',
          boxShadow: isSelected
            ? '0 0 10px rgba(255,255,255,0.7)'
            : 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      />
      {/* Back face */}
      <div
        style={{
          ...faceBase,
          width: `${W}px`,
          height: `${H}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.dark,
          transform: `rotateY(180deg) translateZ(${hd}px)`,
        }}
      />
      {/* Top face */}
      <div
        style={{
          ...faceBase,
          width: `${W}px`,
          height: `${D}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hd}px`,
          backgroundColor: colors.top,
          transform: `rotateX(90deg) translateZ(${hh}px)`,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.3)',
        }}
      />
      {/* Bottom face */}
      <div
        style={{
          ...faceBase,
          width: `${W}px`,
          height: `${D}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hd}px`,
          backgroundColor: colors.dark,
          transform: `rotateX(-90deg) translateZ(${hh}px)`,
        }}
      />
      {/* Right face */}
      <div
        style={{
          ...faceBase,
          width: `${D}px`,
          height: `${H}px`,
          marginLeft: `-${hd}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.side,
          transform: `rotateY(90deg) translateZ(${hw}px)`,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
      {/* Left face */}
      <div
        style={{
          ...faceBase,
          width: `${D}px`,
          height: `${H}px`,
          marginLeft: `-${hd}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.side,
          transform: `rotateY(-90deg) translateZ(${hw}px)`,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      {isSelected && (
        <span
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ transform: `translateX(-50%) translateZ(${hd + 4}px)`, pointerEvents: 'none' }}
        >
          {risk}% risk
        </span>
      )}
    </button>
  );
}
