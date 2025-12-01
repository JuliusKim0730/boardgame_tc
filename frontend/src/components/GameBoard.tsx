import './GameBoard.css';

interface Props {
  currentPosition: number;
  onPositionClick: (position: number) => void;
  disabled: boolean;
}

function GameBoard({ currentPosition, onPositionClick, disabled }: Props) {
  const positions = [
    { id: 1, name: '무료 계획', color: '#4CAF50' },
    { id: 2, name: '조사하기', color: '#2196F3' },
    { id: 3, name: '집안일', color: '#FF9800' },
    { id: 4, name: '여행 지원', color: '#9C27B0' },
    { id: 5, name: '찬스', color: '#F44336' },
    { id: 6, name: '자유 행동', color: '#FFD700' },
  ];

  const getAdjacentPositions = (pos: number): number[] => {
    const adjacency: { [key: number]: number[] } = {
      1: [2],
      2: [1, 3, 4],
      3: [2, 5],
      4: [2, 6],
      5: [3, 6],
      6: [4, 5],
    };
    return adjacency[pos] || [];
  };

  const adjacent = getAdjacentPositions(currentPosition);

  return (
    <div className="game-board">
      <svg width="600" height="400" viewBox="0 0 600 400">
        {/* 연결선 */}
        <line x1="100" y1="100" x2="300" y2="100" stroke="#ddd" strokeWidth="2" />
        <line x1="300" y1="100" x2="500" y2="100" stroke="#ddd" strokeWidth="2" />
        <line x1="300" y1="100" x2="200" y2="250" stroke="#ddd" strokeWidth="2" />
        <line x1="500" y1="100" x2="400" y2="250" stroke="#ddd" strokeWidth="2" />
        <line x1="200" y1="250" x2="300" y2="350" stroke="#ddd" strokeWidth="2" />
        <line x1="400" y1="250" x2="300" y2="350" stroke="#ddd" strokeWidth="2" />

        {/* 위치 노드 */}
        {positions.map((pos) => {
          const coords = getPositionCoords(pos.id);
          const isCurrent = pos.id === currentPosition;
          const isAdjacent = adjacent.includes(pos.id);
          const canClick = !disabled && isAdjacent;

          return (
            <g key={pos.id}>
              <circle
                cx={coords.x}
                cy={coords.y}
                r="40"
                fill={isCurrent ? pos.color : '#fff'}
                stroke={pos.color}
                strokeWidth="3"
                className={canClick ? 'clickable' : ''}
                onClick={() => canClick && onPositionClick(pos.id)}
                style={{ cursor: canClick ? 'pointer' : 'default' }}
              />
              <text
                x={coords.x}
                y={coords.y - 5}
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill={isCurrent ? '#fff' : '#333'}
              >
                {pos.id}
              </text>
              <text
                x={coords.x}
                y={coords.y + 15}
                textAnchor="middle"
                fontSize="12"
                fill={isCurrent ? '#fff' : '#666'}
              >
                {pos.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function getPositionCoords(position: number): { x: number; y: number } {
  const coords: { [key: number]: { x: number; y: number } } = {
    1: { x: 100, y: 100 },
    2: { x: 300, y: 100 },
    3: { x: 500, y: 100 },
    4: { x: 200, y: 250 },
    5: { x: 400, y: 250 },
    6: { x: 300, y: 350 },
  };
  return coords[position] || { x: 0, y: 0 };
}

export default GameBoard;
