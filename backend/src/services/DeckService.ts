import { parseJSON, shuffle } from '../game/rules';

export type DeckType = 'plan' | 'freeplan' | 'house' | 'support' | 'chance' | 'joint' | 'travel';

/**
 * 모든 카드 드로우가 거치는 단일 진입점.
 *
 * 룰북 10. 카드 더미 소진 규칙:
 *  - 덱이 비면 해당 종류의 버린 카드 더미 전체를 섞어 새 덱으로 사용
 *  - 버린 카드도 없으면 더 이상 뽑을 수 없음 (null 반환, 에러 아님)
 *
 * '버린 카드' = 이 게임에서 덱에도, 누군가의 손패에도, 구매/획득 목록에도 없는 카드.
 * (집안일·여행지원·찬스 카드는 사용 즉시 버린 카드가 된다)
 */
export async function drawCard(client: any, gameId: string, type: DeckType): Promise<any | null> {
  const deckResult = await client.query(
    'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2 FOR UPDATE',
    [gameId, type]
  );
  if (deckResult.rows.length === 0) {
    throw new Error(`${type} 덱을 찾을 수 없습니다`);
  }

  const heldIds = await heldCardIds(client, gameId, type);
  let order: string[] = parseJSON<string[]>(deckResult.rows[0].card_order, []).filter((id) => !heldIds.has(id));

  if (order.length === 0) {
    order = await discardPile(client, gameId, type, heldIds);
  }
  if (order.length === 0) {
    return null;
  }

  const [cardId, ...rest] = order;
  await client.query('UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3', [
    JSON.stringify(rest),
    gameId,
    type,
  ]);

  const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
  const card = cardResult.rows[0];
  return {
    ...card,
    effects: parseJSON(card.effects, {}),
    metadata: parseJSON(card.metadata, {}),
  };
}

/** 지정한 카드들을 덱 맨 아래로 돌려놓는다 (CH17에서 선택하지 않은 공동 목표 등) */
export async function returnToDeckBottom(client: any, gameId: string, type: DeckType, cardIds: string[]) {
  const deckResult = await client.query(
    'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2 FOR UPDATE',
    [gameId, type]
  );
  const order = parseJSON<string[]>(deckResult.rows[0]?.card_order, []).filter((id) => !cardIds.includes(id));
  await client.query('UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3', [
    JSON.stringify([...order, ...cardIds]),
    gameId,
    type,
  ]);
}

async function heldCardIds(client: any, gameId: string, type: DeckType): Promise<Set<string>> {
  const result = await client.query(
    `SELECT h.card_id AS id FROM hands h
       JOIN player_states ps ON ps.id = h.player_state_id
       JOIN cards c ON c.id = h.card_id
      WHERE ps.game_id = $1 AND c.type = $2
     UNION
     SELECT p.card_id AS id FROM purchased p
       JOIN player_states ps ON ps.id = p.player_state_id
       JOIN cards c ON c.id = p.card_id
      WHERE ps.game_id = $1 AND c.type = $2`,
    [gameId, type]
  );
  const ids = new Set<string>(result.rows.map((r: any) => r.id));
  if (type === 'joint') {
    const game = await client.query('SELECT joint_plan_card_id FROM games WHERE id = $1', [gameId]);
    if (game.rows[0]?.joint_plan_card_id) ids.add(game.rows[0].joint_plan_card_id);
  }
  return ids;
}

async function discardPile(client: any, gameId: string, type: DeckType, heldIds: Set<string>): Promise<string[]> {
  const all = await client.query('SELECT id, metadata FROM cards WHERE type = $1', [type]);
  let candidates = all.rows;
  if (type === 'chance') {
    // 2인 게임에서는 CH11~CH13(forbidden_2p)을 덱에 다시 넣지 않는다
    const count = await client.query('SELECT COUNT(*)::int AS n FROM player_states WHERE game_id = $1', [gameId]);
    if (count.rows[0].n === 2) {
      candidates = candidates.filter((r: any) => !parseJSON<any>(r.metadata, {}).forbidden_2p);
    }
  }
  const discarded: string[] = candidates.map((r: any) => r.id as string).filter((id: string) => !heldIds.has(id));
  if (discarded.length === 0) return [];

  const reshuffled = shuffle(discarded);
  await client.query(
    'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
    [gameId, 'deck_reshuffled', JSON.stringify({ type, count: reshuffled.length })]
  );
  return reshuffled;
}
