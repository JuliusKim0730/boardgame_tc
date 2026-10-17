import './PlayerInfo.css';

interface Props {
  money: number;
  position: number;
  resolveToken: number; // 0~2
  traits: any;
}

function PlayerInfo({ money, position, resolveToken, traits }: Props) {
  return (
    <div className="player-info card">
      <h3>내 정보</h3>
      
      <div className="info-item">
        <span className="label">💰 돈:</span>
        <span className="value">{money.toLocaleString()}TC</span>
      </div>

      <div className="info-item">
        <span className="label">📍 위치:</span>
        <span className="value">{position}번 칸</span>
      </div>

      <div className="info-item">
        <span className="label">🎯 결심 토큰:</span>
        <span className="value">
          <div className="resolve-tokens">
            {Array.from({ length: resolveToken }).map((_, i) => (
              <span key={i} className="token">🔥</span>
            ))}
            <span className="token-count">{resolveToken}/2</span>
          </div>
        </span>
      </div>

      <div className="traits-section">
        <h4>특성 점수</h4>
        <div className="traits-grid">
          <div className="trait-item">
            <span>🍽️ 맛</span>
            <span>{traits.taste || 0}</span>
          </div>
          <div className="trait-item">
            <span>🏛️ 역사</span>
            <span>{traits.history || 0}</span>
          </div>
          <div className="trait-item">
            <span>🌲 자연</span>
            <span>{traits.nature || 0}</span>
          </div>
          <div className="trait-item">
            <span>🎭 문화</span>
            <span>{traits.culture || 0}</span>
          </div>
          <div className="trait-item">
            <span>⚽ 레저</span>
            <span>{traits.leisure || 0}</span>
          </div>
          <div className="trait-item">
            <span>🏊 물놀이</span>
            <span>{traits.water || 0}</span>
          </div>
          <div className="trait-item">
            <span>💭 추억</span>
            <span>{traits.memory || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerInfo;
