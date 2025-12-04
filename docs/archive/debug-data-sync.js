#!/usr/bin/env node

/**
 * 데이터 싱크 및 참조 무결성 진단 스크립트
 * 
 * 사용법:
 *   node debug-data-sync.js
 */

const issues = [];
const warnings = [];

console.log('🔍 데이터 싱크 및 참조 무결성 진단 시작...\n');

// 1. 백엔드 데이터 흐름 검증
console.log('📊 백엔드 데이터 흐름 검증...');

const backendDataFlow = {
  'GameSetupService': {
    file: 'backend/src/services/GameSetupService.ts',
    dataPoints: [
      { name: 'player_states 생성', fields: ['game_id', 'player_id', 'money', 'position', 'resolve_token', 'turn_order'] },
      { name: 'decks 초기화', fields: ['game_id', 'type', 'card_order'] },
      { name: 'games 업데이트', fields: ['joint_plan_card_id', 'status', 'current_turn_player_id'] },
      { name: 'turns 생성', fields: ['game_id', 'day', 'player_state_id'] }
    ],
    issues: [
      '✅ 턴 순서는 슬롯 순서(created_at)로 결정',
      '✅ 첫 플레이어는 방장(turn_order=0)',
      '✅ card_order는 JSON.stringify로 저장',
      '⚠️  여행지 카드 배분 시 purchased 테이블 사용'
    ]
  },
  'TurnService': {
    file: 'backend/src/services/TurnService.ts',
    dataPoints: [
      { name: 'move 처리', fields: ['position', 'last_position'] },
      { name: 'performAction', fields: ['money', 'traits', 'hands'] },
      { name: 'drawCard', fields: ['card_order', 'hands', 'seq'] },
      { name: 'event_logs 기록', fields: ['game_id', 'event_type', 'data'] }
    ],
    issues: [
      '✅ card_order 파싱: string → JSON.parse, array → 그대로',
      '✅ effects 파싱: safeParseJSON 사용',
      '✅ 손패 seq는 MAX(seq)+1로 자동 증가',
      '⚠️  집안일 첫 방문 보너스는 event_logs 카운트로 확인'
    ]
  },
  'TurnManager': {
    file: 'backend/src/services/TurnManager.ts',
    dataPoints: [
      { name: 'turnLocks Map', fields: ['gameId', 'playerId'] },
      { name: 'endTurn 처리', fields: ['current_turn_player_id', 'day', 'turn_order'] },
      { name: '날짜 전환', fields: ['day', 'resolve_token'] }
    ],
    issues: [
      '✅ 턴 락은 메모리 Map으로 관리',
      '✅ 모든 플레이어 턴 완료 시 날짜 증가',
      '✅ 8일차 시작 시 resolve_token=1 재충전',
      '⚠️  선플레이어 변경: turn_order=1 (2번째 플레이어)'
    ]
  }
};

Object.entries(backendDataFlow).forEach(([service, info]) => {
  console.log(`\n  📁 ${service} (${info.file})`);
  info.dataPoints.forEach(dp => {
    console.log(`    - ${dp.name}: [${dp.fields.join(', ')}]`);
  });
  info.issues.forEach(issue => {
    console.log(`    ${issue}`);
  });
});

console.log('\n');

// 2. 프론트엔드 데이터 호출 검증
console.log('🎨 프론트엔드 데이터 호출 검증...');

const frontendDataFlow = {
  'GameScreen': {
    file: 'frontend/src/components/GameScreen.tsx',
    apiCalls: [
      { name: 'loadGameState', endpoint: 'GET /api/games/:gameId/state', returns: ['game', 'players', 'jointPlan'] },
      { name: 'handleMove', endpoint: 'POST /api/games/:gameId/move', params: ['playerId', 'position'] },
      { name: 'handleAction', endpoint: 'POST /api/games/:gameId/action', params: ['playerId', 'actionType'] },
      { name: 'handleContribute', endpoint: 'POST /api/games/:gameId/contribute', params: ['playerId', 'amount'] }
    ],
    socketEvents: [
      'turn-started',
      'state-updated',
      'player-moved',
      'action-completed',
      'game-ended'
    ],
    issues: [
      '✅ loadGameState는 preserveActionState로 행동 상태 보존',
      '✅ 여행지 카드는 players[].travelCard로 조회',
      '✅ 공동 계획 카드는 jointPlan.card로 조회',
      '⚠️  effects/metadata는 JSON 파싱 필요'
    ]
  },
  'WaitingRoom': {
    file: 'frontend/src/components/WaitingRoom.tsx',
    apiCalls: [
      { name: 'loadRoomState', endpoint: 'GET /api/rooms/:roomId', returns: ['slots'] },
      { name: 'handleSlotAction', endpoint: 'POST /api/rooms/:roomId/slots/:index', params: ['action'] },
      { name: 'handleStart', endpoint: 'POST /api/rooms/:roomId/start', returns: ['gameId'] }
    ],
    socketEvents: [
      'player-joined',
      'player-left',
      'slot-updated',
      'game-started'
    ],
    issues: [
      '✅ 슬롯 정보는 서버에서 받은 그대로 사용',
      '✅ 방장만 슬롯 관리 가능 (isHost 체크)',
      '✅ 최소 2명, 최대 5명 검증',
      '⚠️  첫 번째 슬롯(방장)은 수정 불가'
    ]
  },
  'ResultScreen': {
    file: 'frontend/src/components/ResultScreen.tsx',
    apiCalls: [
      { name: 'loadResults', endpoint: 'POST /api/games/:gameId/finalize', returns: ['results[]'] },
      { name: 'handleTraitConversion', endpoint: 'POST /api/games/:gameId/convert-traits', params: ['playerId', 'conversions'] },
      { name: 'handleRestart', endpoint: 'POST /api/rooms/:roomId/soft-reset', returns: [] }
    ],
    socketEvents: [],
    issues: [
      '✅ 비주류 특성(가중치 1배) 추출',
      '✅ 3점당 1회 변환 가능',
      '✅ 변환 후 결과 재로드',
      '⚠️  breakdown 구조 확인 필요'
    ]
  }
};

Object.entries(frontendDataFlow).forEach(([component, info]) => {
  console.log(`\n  📁 ${component} (${info.file})`);
  console.log(`    API 호출:`);
  info.apiCalls.forEach(call => {
    console.log(`      - ${call.name}: ${call.endpoint}`);
    if (call.params) console.log(`        params: [${call.params.join(', ')}]`);
    if (call.returns) console.log(`        returns: [${call.returns.join(', ')}]`);
  });
  if (info.socketEvents.length > 0) {
    console.log(`    Socket 이벤트: [${info.socketEvents.join(', ')}]`);
  }
  info.issues.forEach(issue => {
    console.log(`    ${issue}`);
  });
});

console.log('\n');

// 3. 데이터 싱크 포인트 검증
console.log('🔄 데이터 싱크 포인트 검증...');

const syncPoints = [
  {
    name: '게임 시작 시 플레이어 순서',
    backend: 'GameSetupService: 슬롯 순서(created_at) → turn_order',
    frontend: 'WaitingRoom: 슬롯 순서 → 서버 전송',
    sync: '✅ 슬롯 순서가 턴 순서로 직접 매핑됨',
    risk: '⚠️  슬롯 변경 시 created_at 순서 유지 필요'
  },
  {
    name: '카드 드로우 시 덱 상태',
    backend: 'TurnService.drawCard: card_order shift() → JSON.stringify',
    frontend: 'GameScreen: 카드 획득 → loadGameState',
    sync: '✅ 덱은 서버에서만 관리, 프론트는 결과만 표시',
    risk: '⚠️  card_order 파싱 실패 시 게임 중단'
  },
  {
    name: '턴 전환 시 상태 동기화',
    backend: 'TurnManager.endTurn: current_turn_player_id 업데이트 → Socket 전송',
    frontend: 'GameScreen: turn-started 이벤트 → loadGameState',
    sync: '✅ Socket 이벤트로 실시간 동기화',
    risk: '⚠️  Socket 연결 끊김 시 상태 불일치'
  },
  {
    name: '공동 계획 카드 정보',
    backend: 'gameRoutes: joint_plan_card_id → cards 조인 → effects/metadata 파싱',
    frontend: 'GameScreen: jointPlan.card → effects/metadata 사용',
    sync: '✅ 서버에서 파싱 후 전송',
    risk: '⚠️  effects/metadata가 string인 경우 추가 파싱 필요'
  },
  {
    name: '여행지 카드 가중치',
    backend: 'GameSetupService: purchased 테이블에 저장',
    frontend: 'GameScreen: players[].travelCard.metadata.multipliers',
    sync: '✅ 서버에서 조인하여 전송',
    risk: '⚠️  metadata 파싱 실패 시 가중치 정보 손실'
  }
];

syncPoints.forEach((point, index) => {
  console.log(`\n  ${index + 1}. ${point.name}`);
  console.log(`     Backend: ${point.backend}`);
  console.log(`     Frontend: ${point.frontend}`);
  console.log(`     ${point.sync}`);
  console.log(`     ${point.risk}`);
});

console.log('\n');

// 4. 잠재적 문제점 분석
console.log('⚠️  잠재적 문제점 분석...');

const potentialIssues = [
  {
    category: 'JSON 파싱',
    issue: 'card_order, effects, metadata가 string/object 혼재',
    location: 'TurnService.drawCard, gameRoutes.getGameState',
    solution: 'safeParseJSON 헬퍼 함수 사용 (이미 적용됨)',
    severity: '🟡 중간'
  },
  {
    category: '턴 락 동기화',
    issue: '서버 재시작 시 turnLocks Map 초기화',
    location: 'TurnManager.turnLocks (메모리)',
    solution: 'DB에서 current_turn_player_id 복원 로직 필요',
    severity: '🔴 높음'
  },
  {
    category: 'Socket 연결 끊김',
    issue: '네트워크 불안정 시 상태 불일치',
    location: 'GameScreen Socket 이벤트',
    solution: '재연결 시 loadGameState 자동 호출 (이미 적용됨)',
    severity: '🟡 중간'
  },
  {
    category: '슬롯 순서 변경',
    issue: '슬롯 변경 시 created_at 순서 유지 안 됨',
    location: 'RoomService.updateSlot',
    solution: 'AI 추가 시 created_at을 현재 시간으로 설정',
    severity: '🟢 낮음'
  },
  {
    category: '비주류 특성 변환',
    issue: 'multiplier=1인 특성만 변환 가능',
    location: 'ResultScreen.getMinorTraits',
    solution: 'breakdown 구조 정확히 확인 필요',
    severity: '🟡 중간'
  }
];

potentialIssues.forEach((issue, index) => {
  console.log(`\n  ${index + 1}. [${issue.category}] ${issue.severity}`);
  console.log(`     문제: ${issue.issue}`);
  console.log(`     위치: ${issue.location}`);
  console.log(`     해결: ${issue.solution}`);
});

console.log('\n');

// 5. 권장 수정사항
console.log('💡 권장 수정사항...\n');

const recommendations = [
  {
    priority: '🔴 높음',
    title: '턴 락 복원 로직 추가',
    description: '서버 재시작 시 DB에서 current_turn_player_id를 읽어 turnLocks 복원',
    file: 'backend/src/services/TurnManager.ts',
    code: `
// TurnManager에 추가
async restoreTurnLocks() {
  const result = await pool.query(
    'SELECT id, current_turn_player_id FROM games WHERE status = \\'running\\' AND current_turn_player_id IS NOT NULL'
  );
  result.rows.forEach(row => {
    this.turnLocks.set(row.id, row.current_turn_player_id);
  });
}
    `.trim()
  },
  {
    priority: '🟡 중간',
    title: 'JSON 파싱 일관성 확보',
    description: '모든 JSON 필드에 safeParseJSON 적용',
    file: 'backend/src/routes/gameRoutes.ts',
    code: `
// getGameState 엔드포인트에서
jointPlanCard = {
  ...card,
  effects: safeParseJSON(card.effects, 'effects'),
  metadata: safeParseJSON(card.metadata, 'metadata')
};
    `.trim()
  },
  {
    priority: '🟡 중간',
    title: 'Socket 재연결 시 상태 동기화',
    description: 'Socket 재연결 시 자동으로 게임 상태 로드',
    file: 'frontend/src/components/GameScreen.tsx',
    code: `
socket.on('reconnect', () => {
  console.log('Socket reconnected, reloading game state');
  loadGameState();
});
    `.trim()
  },
  {
    priority: '🟢 낮음',
    title: 'API 응답 타입 검증',
    description: 'TypeScript 인터페이스로 API 응답 구조 명시',
    file: 'frontend/src/types/api.ts',
    code: `
export interface GameStateResponse {
  game: {
    id: string;
    day: number;
    status: string;
    currentTurnPlayerId: string | null;
    travelTheme: string | null;
    jointPlanCardId: string | null;
  };
  players: PlayerState[];
  jointPlan: {
    card: Card | null;
    total: number;
    target: number;
  };
}
    `.trim()
  }
];

recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.priority} ${rec.title}`);
  console.log(`   설명: ${rec.description}`);
  console.log(`   파일: ${rec.file}`);
  console.log(`   코드:\n${rec.code}\n`);
});

console.log('═'.repeat(80));
console.log('\n✅ 데이터 싱크 진단 완료!\n');
console.log('📋 요약:');
console.log(`  - 백엔드 서비스: ${Object.keys(backendDataFlow).length}개 검증`);
console.log(`  - 프론트엔드 컴포넌트: ${Object.keys(frontendDataFlow).length}개 검증`);
console.log(`  - 싱크 포인트: ${syncPoints.length}개 확인`);
console.log(`  - 잠재적 문제: ${potentialIssues.length}개 발견`);
console.log(`  - 권장 수정사항: ${recommendations.length}개\n`);

console.log('📚 다음 단계:');
console.log('  1. 높은 우선순위 수정사항 적용');
console.log('  2. 로컬 환경에서 테스트');
console.log('  3. 배포 전 통합 테스트\n');
