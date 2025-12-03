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
      1: [2, 3],      // 무료계획 → 조사하기, 집안일
      2: [1, 4],      // 조사하기 → 무료계획, 여행지원
      3: [1, 5],      // 집안일 → 무료계획, 찬스
      4: [2, 5, 6],   // 여행지원 → 조사하기, 찬스, 자유행동
      5: [3, 4, 6],   // 찬스 → 집안일, 여행지원, 자유행동
      6: [4, 5],      // 자유행동 → 여행지원, 찬스
    };
    return adjacency[pos] || [];
  };

  const adjacent = getAdjacentPositions(currentPosition);
  
  console.log('GameBoard 렌더링:', { 
    currentPosition, 
    adjacent, 
    disabled,
    canClickAny: !disabled && adjacent.length > 0
  });

  return (
    <div className="game-board">
      <svg width="600" height="400" viewBox="0 0 600 400">
        {/* 연결선 - 새로운 레이아웃 */}
        {/* 1(무료계획) - 2(조사하기) */}
        <line x1="100" y1="100" x2="300" y2="100" stroke="#ddd" strokeWidth="2" />
        {/* 1(무료계획) - 3(집안일) */}
        <line x1="100" y1="100" x2="100" y2="250" stroke="#ddd" strokeWidth="2" />
        {/* 2(조사하기) - 4(여행지원) */}
        <line x1="300" y1="100" x2="500" y2="100" stroke="#ddd" strokeWidth="2" />
        {/* 3(집안일) - 5(찬스) */}
        <line x1="100" y1="250" x2="300" y2="250" stroke="#ddd" strokeWidth="2" />
        {/* 4(여행지원) - 5(찬스) */}
        <line x1="500" y1="100" x2="300" y2="250" stroke="#ddd" strokeWidth="2" />
        {/* 4(여행지원) - 6(자유행동) */}
        <line x1="500" y1="100" x2="500" y2="350" stroke="#ddd" strokeWidth="2" />
        {/* 5(찬스) - 6(자유행동) */}
        <line x1="300" y1="250" x2="500" y2="350" stroke="#ddd" strokeWidth="2" />

        {/* 위치 노드 */}
        {positions.map((pos) => {
          const coords = getPositionCoords(pos.id);
          const isCurrent = pos.id === currentPosition;
          const isAdjacent = adjacent.includes(pos.id);
          const canClick = !disabled && isAdjacent;

          return (
            <g key={pos.id}>
              {/* 인접 칸 강조 효과 */}
              {canClick && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="50"
                  fill="none"
                  stroke={pos.color}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="45"
                    to="55"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              
              <circle
                cx={coords.x}
                cy={coords.y}
                r="40"
                fill={isCurrent ? pos.color : canClick ? `${pos.color}20` : '#fff'}
                stroke={pos.color}
                strokeWidth={canClick ? '4' : '3'}
                className={canClick ? 'clickable' : ''}
                onClick={() => {
                  console.log('=== 칸 클릭 ===');
                  console.log('클릭한 칸:', pos.id, pos.name);
                  console.log('클릭 가능 여부:', canClick);
                  console.log('disabled:', disabled);
                  console.log('isAdjacent:', isAdjacent);
                  if (canClick) {
                    console.log('onPositionClick 호출:', pos.id);
                    onPositionClick(pos.id);
                  } else {
                    console.log('클릭 불가 - 조건 미충족');
                  }
                }}
                style={{ cursor: canClick ? 'pointer' : 'default' }}
              />
              <text
                x={coords.x}
                y={coords.y - 5}
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill={isCurrent ? '#fff' : '#333'}
                pointerEvents="none"
              >
                {pos.id}
              </text>
              <text
                x={coords.x}
                y={coords.y + 15}
                textAnchor="middle"
                fontSize="12"
                fill={isCurrent ? '#fff' : '#666'}
                pointerEvents="none"
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
    1: { x: 100, y: 100 },   // 무료 계획 (좌상)
    2: { x: 300, y: 100 },   // 조사하기 (중상)
    3: { x: 100, y: 250 },   // 집안일 (좌중) - 위치 변경
    4: { x: 500, y: 100 },   // 여행 지원 (우상) - 위치 변경
    5: { x: 300, y: 250 },   // 찬스 (중중)
    6: { x: 500, y: 350 },   // 자유 행동 (우하) - 위치 변경
  };
  return coords[position] || { x: 0, y: 0 };
}

export default GameBoard;
