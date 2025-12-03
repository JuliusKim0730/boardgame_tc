import { useState, useEffect } from 'react';
import { api } from '../services/api';
import './ActionLog.css';

interface Props {
  gameId: string;
}

interface LogEntry {
  id: string;
  event_type: string;
  data: any;
  created_at: string;
  nickname?: string;
}

function ActionLog({ gameId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    
    // 5초마다 로그 갱신
    const interval = setInterval(loadLogs, 5000);
    
    return () => clearInterval(interval);
  }, [gameId]);

  const loadLogs = async () => {
    try {
      const response = await api.getEventLogs(gameId);
      setLogs(response.data.logs || []);
      setLoading(false);
    } catch (error) {
      console.error('로그 로드 실패:', error);
      setLoading(false);
    }
  };

  const formatLog = (log: LogEntry): string => {
    const nickname = log.nickname || '플레이어';
    
    switch (log.event_type) {
      case 'move':
        return `${nickname}이(가) ${log.data.from}번 → ${log.data.to}번 칸으로 이동`;
      case 'action_1':
        return `${nickname}이(가) 무료 계획 카드 획득`;
      case 'action_2':
        return `${nickname}이(가) 일반 계획 카드 획득`;
      case 'action_3':
        return `${nickname}이(가) 집안일 수행`;
      case 'action_4':
        return `${nickname}이(가) 여행 지원 카드 획득`;
      case 'action_5':
        return `${nickname}이(가) 찬스 카드 획득`;
      case 'action_6':
        return `${nickname}이(가) 자유 행동 수행`;
      case 'resolve_token_used':
        return `${nickname}이(가) 결심 토큰 사용 (Day ${log.data.day})`;
      case 'game_started':
        return `🎮 게임 시작!`;
      case 'day_changed':
        return `📅 Day ${log.data.day} 시작`;
      default:
        return `${nickname}: ${log.event_type}`;
    }
  };

  const getLogIcon = (eventType: string): string => {
    if (eventType === 'move') return '🚶';
    if (eventType.startsWith('action_')) return '⚡';
    if (eventType === 'resolve_token_used') return '🔥';
    if (eventType === 'game_started') return '🎮';
    if (eventType === 'day_changed') return '📅';
    return '📝';
  };

  if (loading) {
    return (
      <div className="action-log">
        <h3>행동 로그</h3>
        <div className="log-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="action-log">
      <h3>행동 로그</h3>
      <div className="log-entries">
        {logs.length === 0 ? (
          <div className="log-empty">아직 행동이 없습니다</div>
        ) : (
          logs.slice(-10).reverse().map((log) => (
            <div key={log.id} className="log-entry">
              <span className="log-icon">{getLogIcon(log.event_type)}</span>
              <span className="log-text">{formatLog(log)}</span>
              <span className="log-time">
                {new Date(log.created_at).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActionLog;
