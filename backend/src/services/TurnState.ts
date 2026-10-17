import { pool } from '../db/pool';
import { parseJSON } from '../game/rules';

/**
 * 한 턴 안에서 일어난 일(이동/주 행동/추가 행동 권한/추가 행동)을
 * 기존 `actions` 테이블에 기록하고 다시 읽어 서버가 턴 규칙을 강제한다.
 * (스키마 변경 없이 동작하도록 kind + payload만 사용)
 */
export type ExtraCreditSource = 'resolve' | 'CH18' | 'CH19' | 'CH25';

export interface ExtraCredit {
  source: ExtraCreditSource;
  allowRepeat?: boolean; // CH19: 현재 칸 행동을 한 번 더 (직전 행동 반복 허용)
  fixedAction?: number; // CH19: 이 행동만 가능
}

export interface TurnInfo {
  turnId: string | null;
  moved: boolean;
  mainDone: boolean;
  lastAction: number | null;
  pendingCredits: ExtraCredit[];
}

export async function getPlayerState(client: any, gameId: string, playerId: string) {
  const result = await client.query('SELECT * FROM player_states WHERE game_id = $1 AND player_id = $2', [
    gameId,
    playerId,
  ]);
  if (result.rows.length === 0) throw new Error('플레이어 상태를 찾을 수 없습니다');
  return result.rows[0];
}

export async function getRoomId(gameId: string, client: any = pool): Promise<string | null> {
  const result = await client.query('SELECT room_id FROM games WHERE id = $1', [gameId]);
  return result.rows[0]?.room_id ?? null;
}

export async function getPlayerCount(client: any, gameId: string): Promise<number> {
  const result = await client.query('SELECT COUNT(*)::int AS n FROM player_states WHERE game_id = $1', [gameId]);
  return result.rows[0].n;
}

export async function isAIPlayer(client: any, playerId: string): Promise<boolean> {
  const result = await client.query('SELECT is_ai FROM players WHERE id = $1', [playerId]);
  return !!result.rows[0]?.is_ai;
}

export async function getTurnInfo(client: any, playerStateId: string): Promise<TurnInfo> {
  const turn = await client.query(
    'SELECT id FROM turns WHERE player_state_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [playerStateId]
  );
  const turnId: string | null = turn.rows[0]?.id ?? null;
  if (!turnId) return { turnId, moved: false, mainDone: false, lastAction: null, pendingCredits: [] };

  const actions = await client.query('SELECT kind, payload FROM actions WHERE turn_id = $1 ORDER BY created_at, id', [
    turnId,
  ]);
  let moved = false;
  let mainDone = false;
  let lastAction: number | null = null;
  const credits: ExtraCredit[] = [];
  let used = 0;
  for (const row of actions.rows) {
    const payload = parseJSON<any>(row.payload, {});
    if (row.kind === 'move') moved = true;
    if (row.kind === 'main') {
      mainDone = true;
      lastAction = payload.actionType;
    }
    if (row.kind === 'extra_credit') credits.push(payload);
    if (row.kind === 'extra') {
      used++;
      lastAction = payload.actionType;
    }
  }
  return { turnId, moved, mainDone, lastAction, pendingCredits: credits.slice(used) };
}

export async function recordAction(client: any, turnId: string, kind: string, payload: any) {
  // clock_timestamp(): 같은 트랜잭션 안에서도 기록 순서가 보존되도록
  await client.query('INSERT INTO actions (turn_id, kind, payload, created_at) VALUES ($1, $2, $3, clock_timestamp())', [
    turnId,
    kind,
    JSON.stringify(payload),
  ]);
}

/** 현재 턴 플레이어에게 추가 행동 권한을 부여 (결심 토큰 / 찬스 카드) */
export async function grantExtraCredit(client: any, gameId: string, playerId: string, credit: ExtraCredit) {
  const state = await getPlayerState(client, gameId, playerId);
  const info = await getTurnInfo(client, state.id);
  if (!info.turnId) throw new Error('진행 중인 턴이 없습니다');
  await recordAction(client, info.turnId, 'extra_credit', credit);
}

export async function logEvent(client: any, gameId: string, type: string, data: any) {
  await client.query('INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)', [
    gameId,
    type,
    JSON.stringify(data),
  ]);
}

export async function withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
