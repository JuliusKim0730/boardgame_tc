import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TRAIT_KEYS, TRAIT_LABELS } from '../utils/scoring';
import './ResultScreen.css';

interface Props {
  gameId: string;
  roomId: string;
  playerId: string;
  onRestart: () => void;
  onBackToLobby: () => void;
}

type TraitScore = { base: number; multiplier: number; score: number };

interface PlayerResult {
  playerId: string;
  nickname?: string;
  rank: number;
  totalScore: number;
  memoryScore: number;
  money: number;
  breakdown: Record<string, any> & {
    memory: { base: number; score: number };
    conversions?: number;
    contribution?: number;
    jointPlan?: any;
  };
  purchasedCards: any[];
  travelCard?: any;
}

const TRAIT_ICONS: Record<string, string> = {
  taste: '🍽️',
  history: '🏛️',
  nature: '🌲',
  culture: '🎭',
  leisure: '⚽',
  water: '🏊',
};

function ResultScreen({ gameId, roomId, playerId, onRestart, onBackToLobby }: Props) {
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // 모든 플레이어가 제출해야 결과가 확정되므로 확정될 때까지 다시 시도
    const load = async () => {
      try {
        const response = await api.finalize(gameId);
        if (!cancelled) {
          setResults(response.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) timer = setTimeout(load, 2000);
      }
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameId]);

  const handleRestart = async () => {
    try {
      await api.resultClosed(gameId, playerId);
      await api.softReset(roomId);
      onRestart();
    } catch (error) {
      console.error('재시작 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="result-screen-container">
        <div className="card result-card">
          <h2 className="result-title">결과 계산 중...</h2>
        </div>
      </div>
    );
  }

  const myResult = results.find((r) => r.playerId === playerId);
  const joint = results[0]?.breakdown?.jointPlan;
  const nameOf = (id: string) => results.find((r) => r.playerId === id)?.nickname || '플레이어';
  const winners = results.filter((r) => r.rank === 1);

  return (
    <div className="result-screen-container">
      <div className="card result-card">
        <h2 className="result-title">🎉 게임 결과</h2>
        {winners.length > 1 && <p className="result-subtitle">🤝 공동 우승!</p>}

        <div className="rankings">
          {results.map((result) => (
            <div key={result.playerId} className={`rank-item rank-${result.rank}`}>
              <div className="rank-badge">
                {result.rank === 1 && '🥇'}
                {result.rank === 2 && '🥈'}
                {result.rank === 3 && '🥉'}
                {result.rank > 3 && result.rank}
              </div>
              <div className="player-info">
                <p className="player-name">
                  {result.nickname || `플레이어 ${result.playerId.substring(0, 8)}`}
                  {result.playerId === playerId && ' (나)'}
                </p>
                <p className="player-score">
                  🎯 {result.travelCard?.name || '-'} · 추억 {result.memoryScore} · {result.money.toLocaleString()}TC 남음
                </p>
              </div>
              <div className="score-value">{result.totalScore}점</div>
            </div>
          ))}
        </div>

        {joint && (
          <div className="joint-result">
            <h3>🤝 공동 목표: {joint.cardName}</h3>
            <p>
              기여 합계 {Number(joint.total).toLocaleString()} / {Number(joint.target).toLocaleString()}TC →{' '}
              <strong>{joint.success ? '달성!' : '실패'}</strong>
            </p>
            <p className="joint-contributions">
              {(joint.contributions || [])
                .map((c: any) => `${nameOf(c.playerId)} ${Number(c.amount).toLocaleString()}TC`)
                .join(' · ')}
            </p>
            {joint.success && joint.topContributors?.length > 0 && (
              <p>
                최다 기여 보너스({TRAIT_LABELS[joint.bonus?.trait as keyof typeof TRAIT_LABELS] || joint.bonus?.trait} +
                {joint.bonus?.value}): {joint.topContributors.map(nameOf).join(', ')}
              </p>
            )}
            {!joint.success && joint.penalizedPlayers?.length > 0 && (
              <p>최소 기여 패널티(추억 -2): {joint.penalizedPlayers.map(nameOf).join(', ')}</p>
            )}
          </div>
        )}

        {myResult && (
          <>
            <div className="score-breakdown">
              <h3>내 점수 상세 {myResult.travelCard && `(${myResult.travelCard.name})`}</h3>
              <div className="breakdown-grid">
                {TRAIT_KEYS.map((trait) => {
                  const t = myResult.breakdown[trait] as TraitScore;
                  return (
                    <div className="breakdown-item" key={trait}>
                      <p className="breakdown-label">
                        {TRAIT_ICONS[trait]} {TRAIT_LABELS[trait]}
                      </p>
                      <p className="breakdown-value">
                        {t?.base || 0} × {t?.multiplier ?? 1} = {t?.score || 0}
                      </p>
                    </div>
                  );
                })}
                <div className="breakdown-item">
                  <p className="breakdown-label">💭 추억</p>
                  <p className="breakdown-value">{myResult.breakdown.memory.score}</p>
                </div>
              </div>
              {(myResult.breakdown.conversions || 0) > 0 && (
                <p className="breakdown-note">비주류 특성 변환 {myResult.breakdown.conversions}회 적용</p>
              )}
            </div>

            {myResult.purchasedCards.length > 0 && (
              <div className="score-breakdown">
                <h3>내가 확정한 계획</h3>
                <div className="purchased-list">
                  {myResult.purchasedCards.map((c: any) => (
                    <span key={c.id} className="purchased-chip">
                      {c.type === 'freeplan' ? '🆓' : '🗺️'} {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="result-actions">
          <button className="btn btn-primary" onClick={handleRestart}>
            다시 하기
          </button>
          <button className="btn btn-secondary" onClick={onBackToLobby}>
            로비로
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultScreen;
