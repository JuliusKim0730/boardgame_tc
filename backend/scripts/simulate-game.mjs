// 엔드투엔드 게임 시뮬레이터: 무작위로 두는 '사람' 1명 + 서버 AI (N-1명)가 14일을 끝까지 플레이한다.
// 실제 REST/WebSocket API만 사용하므로 규칙 위반·크래시·점수 계산 오류를 통합 테스트로 잡아낸다.
// 사용법: node scripts/simulate-game.mjs <인원수 2~5> [API 주소, 기본 http://localhost:4000]
import { io } from 'socket.io-client';

const N = parseInt(process.argv[2] || '3');
const BASE = process.argv[3] || 'http://localhost:4000';
const API = `${BASE}/api`;
const ADJ = { 1: [2, 3], 2: [1, 4], 3: [1, 5], 4: [2, 5, 6], 5: [3, 4, 6], 6: [4, 5] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const e = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
    e.data = data;
    throw e;
  }
  return data;
}

const room = await call('POST', '/rooms', { nickname: '테스터' });
const me = room.playerId;
for (let i = 1; i < N; i++) await call('POST', `/rooms/${room.roomId}/slots/${i}`, { action: 'ai' });

const socket = io(BASE, { transports: ['websocket'] });
socket.on('connect', () => socket.emit('join-room', room.roomId));
let finalResults = null;
socket.on('final-results', (d) => { finalResults = d.results; });
socket.on('ai-turn-error', (d) => errors.push(`ai-turn-error: ${d.error}`));
socket.on('chance-request', async (d) => {
  const mine = d.requesterId === me || d.targetId === me;
  if (!mine) return;
  try {
    const st = await call('GET', `/games/${gameId}/state`);
    const others = st.players.filter((p) => p.player_id !== me);
    const target = others[0];
    let response = { targetId: target.player_id, accepted: true };
    if (d.type === 'select_joint_plan') {
      const cards = await call('GET', '/cards/joint-plan');
      response = { cardId: cards[0].id };
    }
    if (d.type === 'purchase_request' || d.type === 'card_exchange') {
      const mineHand = st.players.find((p) => p.player_id === me).hand_cards;
      response = {
        accepted: true,
        targetId: target.player_id,
        cardId: target.hand_cards?.[0]?.id,
        requesterCardId: mineHand?.[0]?.id,
        targetCardId: target.hand_cards?.[0]?.id,
      };
    }
    await call('POST', '/chance/respond', { interactionId: d.interactionId, response });
    console.log(`  [interaction] ${d.type} answered`);
  } catch (e) {
    errors.push(`interaction ${d.type}: ${e.message}`);
  }
});

await sleep(500);
const { gameId } = await call('POST', `/rooms/${room.roomId}/start`);
console.log(`game ${gameId} started with ${N} players`);

const started = Date.now();
let lastSeen = '';
let humanTurns = 0;
let submittedFinal = false;
while (Date.now() - started < 20 * 60 * 1000) {
  const st = await call('GET', `/games/${gameId}/state`);
  const g = st.game;
  if (g.status === 'finished' || finalResults) break;
  if (g.status === 'finalizing') {
    if (!submittedFinal) {
      const my = st.players.find((p) => p.player_id === me);
      let money = my.money;
      const buy = [];
      for (const c of [...my.hand_cards].sort((a, b) => (b.cost || 0) - (a.cost || 0))) {
        if ((c.cost || 0) <= money) { buy.push(c.id); money -= c.cost || 0; }
      }
      const contribution = Math.min(2000, Math.floor(money / 500) * 500);
      try {
        await call('POST', `/games/${gameId}/final-purchase`, { playerId: me, cardIds: buy, contribution });
        console.log(`  human final purchase: ${buy.length} cards, contribution ${contribution}`);
      } catch (e) { errors.push(`final-purchase: ${e.message}`); }
      submittedFinal = true;
    }
    await sleep(1000);
    continue;
  }
  const key = `${g.day}:${g.currentTurnPlayerId}`;
  if (key !== lastSeen) {
    lastSeen = key;
    const p = st.players.find((x) => x.player_id === g.currentTurnPlayerId);
    process.stdout.write(`day ${g.day} turn ${p?.nickname}\n`);
  }
  if (g.currentTurnPlayerId === me) {
    humanTurns++;
    const my = st.players.find((p) => p.player_id === me);
    const options = ADJ[my.position];
    const target = options[Math.floor(Math.random() * options.length)];
    try {
      await call('POST', `/games/${gameId}/move`, { playerId: me, position: target });
      const action = target === 6 ? 2 : target;
      let res;
      if (N === 2 && action === 5) {
        res = await call('POST', `/games/${gameId}/chance-option`, { playerId: me, option: 'card' });
      } else {
        res = await call('POST', `/games/${gameId}/action`, { playerId: me, actionType: action });
      }
      if (res?.card) console.log(`  human @${target}: ${res.card.code} ${res.card.name} ${res.message || ''}`);
      const extra = res?.effectResult || res;
      if (res?.card?.type === 'chance' || res?.effectResult) console.log(`    -> ${res.message}`);
      if (extra?.action === 'select_discard' && extra.requiresSelection) {
        const r = await call('POST', `/games/${gameId}/discard-and-draw`, { playerId: me, cardIds: extra.handCards.slice(0, 1).map((c) => c.id) });
        console.log(`    CH16: ${r.message}`);
      }
      if (extra?.action === 'select_joint_plan' && extra.requiresSelection) {
        const r = await call('POST', `/games/${gameId}/select-joint-plan`, { playerId: me, cardId: extra.options[1].id });
        console.log(`    CH17: ${r.card.name}`);
      }
      if (extra?.action === 'extra_action' || extra?.action === 'repeat_current' || extra?.action === 'buddy_action') {
        const extraType = extra.action === 'repeat_current' ? (target === 6 ? action : target) : (action === 2 ? 3 : 2);
        await call('POST', `/games/${gameId}/extra-action`, { playerId: me, actionType: extraType, skipMove: true });
        console.log(`  human extra action ${extraType}`);
      }
      if (my.resolve_token > 0 && g.day >= 10) {
        const alt = [2, 3, 4].find((a) => a !== action && a !== target);
        await call('POST', `/games/${gameId}/use-resolve-token`, { playerId: me, actionType: alt });
        await call('POST', `/games/${gameId}/action`, { playerId: me, actionType: alt });
        console.log(`  human used resolve token -> action ${alt}`);
      }
    } catch (e) {
      errors.push(`day ${g.day} human turn: ${e.message}`);
    }
    try {
      await call('POST', `/games/${gameId}/end-turn`, { playerId: me });
    } catch (e) {
      errors.push(`end-turn: ${e.message}`);
      await sleep(1000);
    }
  } else {
    await sleep(700);
  }
}

if (!finalResults) {
  try { finalResults = await call('POST', `/games/${gameId}/finalize`); } catch (e) { errors.push(`finalize: ${e.message}`); }
}
const st = await call('GET', `/games/${gameId}/state`);
console.log('\n=== FINAL STATE ===');
for (const p of st.players) {
  console.log(`${p.nickname.padEnd(10)} money=${p.money} tokens=${p.resolve_token} pos=${p.position} travel=${p.travelCard?.name} traits=${JSON.stringify(p.traits)} hand=${p.hand_cards.length}`);
}
console.log('\n=== RESULTS ===');
for (const r of finalResults || []) {
  const name = st.players.find((p) => p.player_id === r.playerId)?.nickname;
  console.log(`#${r.rank} ${name}: ${r.totalScore} (memory ${r.memoryScore}, money ${r.money}) purchased=${(r.purchasedCards || []).map((c) => c.code).join(',')}`);
}
console.log(`\nstatus=${st.game.status} humanTurns=${humanTurns} elapsed=${((Date.now() - started) / 1000).toFixed(0)}s`);
console.log(`errors (${errors.length}):`);
for (const e of errors) console.log('  - ' + e);
socket.close();
process.exit(0);
