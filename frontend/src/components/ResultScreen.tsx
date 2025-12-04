import { useState, useEffect } from 'react';
import { api } from '../services/api';
import TraitConversionModal from './TraitConversionModal';
import './ResultScreen.css';

interface Props {
  gameId: string;
  roomId: string;
  playerId: string;
  onRestart: () => void;
  onBackToLobby: () => void;
}

interface PlayerResult {
  playerId: string;
  rank: number;
  totalScore: number;
  breakdown: {
    taste: { base: number; multiplier: number; score: number };
    history: { base: number; multiplier: number; score: number };
    nature: { base: number; multiplier: number; score: number };
    culture: { base: number; multiplier: number; score: number };
    leisure: { base: number; multiplier: number; score: number };
    water: { base: number; multiplier: number; score: number };
    memory: { base: number; score: number };
  };
  money: number;
  purchasedCards: any[];
  travelCard?: any;
}

function ResultScreen({ gameId, roomId, playerId, onRestart, onBackToLobby }: Props) {
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [myResult, setMyResult] = useState<PlayerResult | null>(null);
  const [showTraitConversion, setShowTraitConversion] = useState(true);
  const [conversionComplete, setConversionComplete] = useState(false);

  useEffect(() => {
    loadResults();
  }, [gameId]);

  const loadResults = async () => {
    try {
      const response = await api.finalize(gameId);
      setResults(response.data);
      
      // 내 결과 찾기
      const mine = response.data.find((r: PlayerResult) => r.playerId === playerId);
      setMyResult(mine);
    } catch (error) {
      console.error('결과 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTraitConversion = async (conversions: number) => {
    try {
      await api.convertTraits(gameId, playerId, conversions);
      setConversionComplete(true);
      setShowTraitConversion(false);
      // 결과 다시 로드
      await loadResults();
    } catch (error) {
      console.error('Failed to convert traits:', error);
      alert('특성 변환에 실패했습니다.');
    }
  };

  const handleSkipConversion = () => {
    setConversionComplete(true);
    setShowTraitConversion(false);
  };

  // 비주류 특성 추출 (가중치 1배)
  const getMinorTraits = (): { [key: string]: number } => {
    if (!myResult) {
      return {
        taste: 0,
        history: 0,
        nature: 0,
        culture: 0,
        leisure: 0,
        water: 0
      };
    }
    
    const minorTraits: { [key: string]: number } = {
      taste: 0,
      history: 0,
      nature: 0,
      culture: 0,
      leisure: 0,
      water: 0
    };
    const breakdown = myResult.breakdown;
    
    if (breakdown.taste.multiplier === 1) minorTraits.taste = breakdown.taste.base;
    if (breakdown.history.multiplier === 1) minorTraits.history = breakdown.history.base;
    if (breakdown.nature.multiplier === 1) minorTraits.nature = breakdown.nature.base;
    if (breakdown.culture.multiplier === 1) minorTraits.culture = breakdown.culture.base;
    if (breakdown.leisure.multiplier === 1) minorTraits.leisure = breakdown.leisure.base;
    if (breakdown.water.multiplier === 1) minorTraits.water = breakdown.water.base;
    
    return minorTraits;
  };

  const getTravelMultipliers = (): { [key: string]: number } => {
    if (!myResult) {
      return {
        taste: 1,
        history: 1,
        nature: 1,
        culture: 1,
        leisure: 1,
        water: 1
      };
    }
    
    return {
      taste: myResult.breakdown.taste.multiplier,
      history: myResult.breakdown.history.multiplier,
      nature: myResult.breakdown.nature.multiplier,
      culture: myResult.breakdown.culture.multiplier,
      leisure: myResult.breakdown.leisure.multiplier,
      water: myResult.breakdown.water.multiplier,
    };
  };

  const getMaxConversions = (): number => {
    const minorTraits = getMinorTraits();
    const totalMinorPoints = Object.values(minorTraits).reduce((sum, val) => sum + val, 0);
    return Math.floor(totalMinorPoints / 3);
  };

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

  return (
    <>
      {showTraitConversion && !conversionComplete && myResult && (
        <TraitConversionModal
          isOpen={true}
          minorTraits={getMinorTraits()}
          multipliers={getTravelMultipliers()}
          maxConversions={getMaxConversions()}
          onConfirm={handleTraitConversion}
          onCancel={handleSkipConversion}
        />
      )}

      {(!showTraitConversion || conversionComplete) && (
        <div className="result-screen-container">
          <div className="card result-card">
            <h2 className="result-title">🎉 게임 결과</h2>

        <div className="rankings">
          {results.map((result) => (
            <div
              key={result.playerId}
              className={`rank-item rank-${result.rank}`}
            >
              <div className="rank-badge">
                {result.rank === 1 && '🥇'}
                {result.rank === 2 && '🥈'}
                {result.rank === 3 && '🥉'}
                {result.rank > 3 && result.rank}
              </div>
              <div className="player-info">
                <p className="player-name">
                  플레이어 {result.playerId.substring(0, 8)}
                  {result.playerId === playerId && ' (나)'}
                </p>
                <p className="player-score">
                  {result.money.toLocaleString()}원 보유
                </p>
              </div>
              <div className="score-value">{result.totalScore}점</div>
            </div>
          ))}
        </div>

        {myResult && (
          <>
            {/* 여행지 카드 정보 */}
            {myResult.travelCard && (
              <div className="travel-card-result">
                <h3>🎯 내 여행지</h3>
                <div className="travel-card-info">
                  <div className="travel-card-name-result">{myResult.travelCard.name}</div>
                  <div className="travel-multipliers">
                    <div className="multiplier-item">
                      <span>🍽️ 맛</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.taste.multiplier}`}>
                        ×{myResult.breakdown.taste.multiplier}
                      </span>
                    </div>
                    <div className="multiplier-item">
                      <span>🏛️ 역사</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.history.multiplier}`}>
                        ×{myResult.breakdown.history.multiplier}
                      </span>
                    </div>
                    <div className="multiplier-item">
                      <span>🌲 자연</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.nature.multiplier}`}>
                        ×{myResult.breakdown.nature.multiplier}
                      </span>
                    </div>
                    <div className="multiplier-item">
                      <span>🎭 문화</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.culture.multiplier}`}>
                        ×{myResult.breakdown.culture.multiplier}
                      </span>
                    </div>
                    <div className="multiplier-item">
                      <span>⚽ 레저</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.leisure.multiplier}`}>
                        ×{myResult.breakdown.leisure.multiplier}
                      </span>
                    </div>
                    <div className="multiplier-item">
                      <span>🏊 물놀이</span>
                      <span className={`multiplier-badge mult-${myResult.breakdown.water.multiplier}`}>
                        ×{myResult.breakdown.water.multiplier}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="score-breakdown">
              <h3>내 점수 상세</h3>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <p className="breakdown-label">🍽️ 맛</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.taste.base} × {myResult.breakdown.taste.multiplier} = {myResult.breakdown.taste.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">🏛️ 역사</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.history.base} × {myResult.breakdown.history.multiplier} = {myResult.breakdown.history.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">🌲 자연</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.nature.base} × {myResult.breakdown.nature.multiplier} = {myResult.breakdown.nature.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">🎭 문화</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.culture.base} × {myResult.breakdown.culture.multiplier} = {myResult.breakdown.culture.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">⚽ 레저</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.leisure.base} × {myResult.breakdown.leisure.multiplier} = {myResult.breakdown.leisure.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">🏊 물놀이</p>
                  <p className="breakdown-value">
                    {myResult.breakdown.water.base} × {myResult.breakdown.water.multiplier} = {myResult.breakdown.water.score}
                  </p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">💭 추억</p>
                  <p className="breakdown-value">{myResult.breakdown.memory.score}</p>
                </div>
              </div>
            </div>
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
      )}
    </>
  );
}

export default ResultScreen;
