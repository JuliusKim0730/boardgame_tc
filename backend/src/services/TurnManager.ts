import { pool } from '../db/pool';
import { Server } from 'socket.io';

export class TurnManager {
  private turnLocks: Map<string, string> = new Map(); // gameId -> playerId
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  // 서버 시작 시 턴 락 복원 (비활성화 - 오래된 게임 정리로 대체)
  async restoreTurnLocks(): Promise<void> {
    console.log('ℹ️  턴 락 복원 비활성화 (새 게임만 처리)');
    // 더 이상 턴 락을 복원하지 않음
    // 서버 재시작 시 진행 중이던 게임은 자동으로 정리됨
  }

  // 턴 잠금 확인
  isCurrentTurn(gameId: string, playerId: string): boolean {
    const lockedPlayer = this.turnLocks.get(gameId);
    return lockedPlayer === playerId;
  }

  // 턴 잠금 설정
  lockTurn(gameId: string, playerId: string): void {
    this.turnLocks.set(gameId, playerId);
    console.log(`🔒 턴 락 설정: gameId=${gameId}, playerId=${playerId}`);
  }

  // 턴 잠금 해제
  unlockTurn(gameId: string): void {
    this.turnLocks.delete(gameId);
    console.log(`🔓 턴 락 해제: gameId=${gameId}`);
  }

  // 턴 시작 (외부 호출용 - 새 트랜잭션)
  async startTurn(gameId: string, playerId: string): Promise<void> {
    const client = await pool.connect();
    try {
      // 타임아웃 설정 (60초 - AI 턴 충분한 시간)
      await client.query('SET statement_timeout = 60000');
      await client.query('BEGIN');

      await this.startTurnInternal(client, gameId, playerId);

      await client.query('COMMIT');
      
      // 커밋 후 턴 잠금 (트랜잭션 외부)
      this.lockTurn(gameId, playerId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 턴 시작 (내부용 - 기존 트랜잭션 사용)
  private async startTurnInternal(client: any, gameId: string, playerId: string): Promise<void> {
    // 턴 레코드 생성
    const gameResult = await client.query(
      'SELECT day, room_id FROM games WHERE id = $1',
      [gameId]
    );
    const currentDay = gameResult.rows[0].day;
    const roomId = gameResult.rows[0].room_id;

    const playerStateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    const playerStateId = playerStateResult.rows[0].id;

    await client.query(
      'INSERT INTO turns (game_id, day, player_state_id) VALUES ($1, $2, $3)',
      [gameId, currentDay, playerStateId]
    );

    // 게임 상태 업데이트
    await client.query(
      'UPDATE games SET current_turn_player_id = $1 WHERE id = $2',
      [playerId, gameId]
    );

    // forced_move 플래그 및 last_position 초기화 (턴 시작 시)
    await client.query(
      'UPDATE player_states SET forced_move = FALSE, last_position = NULL WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );

    // 소켓 이벤트 발송 (턴 시작 알림)
    if (this.io && roomId) {
      this.io.to(roomId).emit('turn-started', {
        gameId,
        playerId,
        day: currentDay
      });
      console.log(`📡 턴 시작 알림 전송: playerId=${playerId}, day=${currentDay}`);
    }
  }

  // 턴 종료 및 다음 플레이어로 전환
  async endTurn(gameId: string, playerId: string): Promise<{ nextPlayerId: string | null; isGameEnd: boolean; isAI: boolean }> {
    const client = await pool.connect();
    try {
      // 타임아웃 설정 (60초)
      await client.query('SET statement_timeout = 60000');
      await client.query('BEGIN');

      // 현재 턴 종료
      await client.query(
        `UPDATE turns SET ended_at = NOW() 
         WHERE game_id = $1 AND player_state_id = (
           SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2
         ) AND ended_at IS NULL`,
        [gameId, playerId]
      );

      // 턴 잠금 해제
      this.unlockTurn(gameId);

      // 다음 플레이어 찾기
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const currentDay = gameResult.rows[0].day;

      const currentPlayerResult = await client.query(
        'SELECT turn_order FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const currentTurnOrder = currentPlayerResult.rows[0].turn_order;

      const playersResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const totalPlayers = parseInt(playersResult.rows[0].count);

      const nextTurnOrder = (currentTurnOrder + 1) % totalPlayers;

      // 모든 플레이어가 턴을 마쳤는지 확인
      const turnsResult = await client.query(
        `SELECT COUNT(*) as completed FROM turns 
         WHERE game_id = $1 AND day = $2 AND ended_at IS NOT NULL`,
        [gameId, currentDay]
      );
      const completedTurns = parseInt(turnsResult.rows[0].completed);
      
      console.log(`📊 Day ${currentDay} 턴 완료 현황: ${completedTurns}/${totalPlayers}`);
      
      // 중복 턴 방지: 이미 모든 플레이어가 턴을 마쳤으면 에러
      if (completedTurns > totalPlayers) {
        console.error(`❌ 턴 카운트 오류: ${completedTurns}/${totalPlayers} - 중복 턴 감지`);
        throw new Error('턴 카운트 오류: 중복 턴이 감지되었습니다');
      }

      // 모든 플레이어가 턴을 마쳤으면 다음 날로
      if (completedTurns >= totalPlayers) {
        // 하루 종료, 다음 날로
        const newDay = currentDay + 1;
        
        console.log(`📅 Day ${currentDay} 완료 → Day ${newDay} 시작`);

        if (newDay > 14) {
          // 게임 종료
          console.log('🏁 14일차 완료 - 게임 종료');
          
          // 룸 ID 조회
          const roomResult = await client.query(
            'SELECT room_id FROM games WHERE id = $1',
            [gameId]
          );
          const roomId = roomResult.rows[0]?.room_id;
          
          await client.query(
            'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
            ['finalizing', gameId]
          );
          await client.query('COMMIT');
          
          // AI 스케줄러 중지
          const { aiScheduler } = await import('./AIScheduler');
          aiScheduler.stopGame(gameId);
          
          // 게임 종료 이벤트 발송
          if (this.io && roomId) {
            this.io.to(roomId).emit('game-ended', {
              gameId,
              message: '14일차가 완료되었습니다! 최종 구매를 진행하세요.'
            });
            console.log(`📡 게임 종료 알림 전송: ${roomId}`);
          }
          
          // AI 플레이어 최종 구매 자동 실행
          setTimeout(async () => {
            try {
              console.log('🤖 AI 최종 구매 자동 실행 시작...');
              await aiScheduler.executeAIFinalPurchases(gameId);
              console.log('✅ AI 최종 구매 완료');
            } catch (error) {
              console.error('❌ AI 최종 구매 실패:', error);
            }
          }, 2000); // 2초 후 실행 (게임 종료 알림 후)
          
          return { nextPlayerId: null, isGameEnd: true, isAI: false };
        }

        // 다음 날 시작
        await client.query(
          'UPDATE games SET day = $1 WHERE id = $2',
          [newDay, gameId]
        );

        // Day 8 시작 시 결심 토큰 회복 (7일차 종료 후, 토큰이 0개인 경우)
        if (newDay === 8) {
          console.log('🔥 Day 8 시작 - 결심 토큰 회복 체크');
          
          // 룸 ID 조회
          const roomResult = await client.query(
            'SELECT room_id FROM games WHERE id = $1',
            [gameId]
          );
          const roomId = roomResult.rows[0].room_id;
          
          // Day 8 시작 알림
          if (this.io) {
            this.io.to(roomId).emit('day-8-started', {
              message: '8일차가 시작되었습니다. 결심 토큰 회복을 확인합니다.'
            });
          }
          
          // 현재 토큰이 0개인 플레이어에게 1개 회복
          const recoveryResult = await client.query(
            `UPDATE player_states 
             SET resolve_token = 1
             WHERE game_id = $1 AND resolve_token = 0
             RETURNING player_id`,
            [gameId]
          );
          
          // 회복된 플레이어 로그 기록
          for (const row of recoveryResult.rows) {
            await client.query(
              'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
              [gameId, 'resolve_token_recovered', JSON.stringify({ 
                playerId: row.player_id, 
                day: newDay,
                from: 0,
                to: 1
              })]
            );
            
            console.log(`✅ 플레이어 ${row.player_id} 결심 토큰 회복: 0 -> 1`);
            
            // 소켓 알림
            if (this.io) {
              this.io.to(roomId).emit('resolve-token-recovered', {
                playerId: row.player_id,
                newCount: 1
              });
            }
          }
          
          if (recoveryResult.rows.length > 0) {
            console.log(`✅ ${recoveryResult.rows.length}명의 플레이어 결심 토큰 회복 완료`);
          } else {
            console.log('ℹ️ 결심 토큰 회복 대상 없음 (모두 1개 이상 보유)');
          }
        }

        // 턴 순서 재배치 (선플레이어 변경)
        // 현재 0번이 마지막으로 가고, 1번이 0번이 됨
        await client.query(
          `UPDATE player_states 
           SET turn_order = CASE 
             WHEN turn_order = 0 THEN $1 - 1
             ELSE turn_order - 1
           END
           WHERE game_id = $2`,
          [totalPlayers, gameId]
        );
        
        console.log(`🔄 선플레이어 변경: 이전 #2 → 새 #1`);

        // 새로운 선플레이어 (turn_order = 0)
        const nextPlayerResult = await client.query(
          `SELECT ps.player_id, p.is_ai 
           FROM player_states ps
           JOIN players p ON p.id = ps.player_id
           WHERE ps.game_id = $1 AND ps.turn_order = 0`,
          [gameId]
        );

        if (nextPlayerResult.rows.length > 0) {
          const nextPlayerId = nextPlayerResult.rows[0].player_id;
          const isAI = nextPlayerResult.rows[0].is_ai;
          
          // 같은 트랜잭션 내에서 다음 턴 시작
          await this.startTurnInternal(client, gameId, nextPlayerId);
          await client.query('COMMIT');
          
          // 커밋 후 턴 잠금
          this.lockTurn(gameId, nextPlayerId);
          
          // 게임 상태 브로드캐스트 (Day 전환 시)
          await this.broadcastGameState(gameId);
          
          console.log(`✅ 다음 턴 시작 (Day 전환): playerId=${nextPlayerId}, isAI=${isAI}`);
          return { nextPlayerId, isGameEnd: false, isAI };
        }
      } else {
        // 같은 날, 다음 플레이어
        const nextPlayerResult = await client.query(
          `SELECT ps.player_id, p.is_ai 
           FROM player_states ps
           JOIN players p ON p.id = ps.player_id
           WHERE ps.game_id = $1 AND ps.turn_order = $2`,
          [gameId, nextTurnOrder]
        );

        if (nextPlayerResult.rows.length > 0) {
          const nextPlayerId = nextPlayerResult.rows[0].player_id;
          const isAI = nextPlayerResult.rows[0].is_ai;
          
          // 같은 트랜잭션 내에서 다음 턴 시작
          await this.startTurnInternal(client, gameId, nextPlayerId);
          await client.query('COMMIT');
          
          // 커밋 후 턴 잠금
          this.lockTurn(gameId, nextPlayerId);
          
          // 게임 상태 브로드캐스트 (같은 날 턴 전환)
          await this.broadcastGameState(gameId);
          
          console.log(`✅ 다음 턴 시작: playerId=${nextPlayerId}, isAI=${isAI}`);
          
          // AI가 아니면 여기서 멈춤 (사용자가 직접 플레이)
          if (!isAI) {
            console.log(`👤 사용자 턴 시작 대기: playerId=${nextPlayerId}`);
          }
          
          return { nextPlayerId, isGameEnd: false, isAI };
        }
      }

      await client.query('COMMIT');
      console.log('⚠️ 다음 플레이어를 찾을 수 없습니다');
      return { nextPlayerId: null, isGameEnd: false, isAI: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 턴 검증 미들웨어
  validateTurn(gameId: string, playerId: string): void {
    if (!this.isCurrentTurn(gameId, playerId)) {
      throw new Error('현재 당신의 턴이 아닙니다');
    }
  }

  // 게임 상태 브로드캐스트
  private async broadcastGameState(gameId: string): Promise<void> {
    if (!this.io) return;

    const client = await pool.connect();
    try {
      // 게임 정보 조회
      const gameResult = await client.query(
        'SELECT room_id, day, current_turn_player_id FROM games WHERE id = $1',
        [gameId]
      );
      
      if (gameResult.rows.length === 0) return;
      
      const { room_id, day, current_turn_player_id } = gameResult.rows[0];
      
      // 플레이어 상태 조회
      const playersResult = await client.query(
        `SELECT ps.*, u.nickname as name, p.is_ai 
         FROM player_states ps
         JOIN players p ON ps.player_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE ps.game_id = $1
         ORDER BY ps.turn_order`,
        [gameId]
      );

      this.io.to(room_id).emit('game-state-updated', {
        gameId,
        day,
        currentTurnPlayerId: current_turn_player_id,
        players: playersResult.rows
      });
      
      console.log(`📡 게임 상태 업데이트 브로드캐스트: ${room_id}`);
    } catch (error) {
      console.error('게임 상태 브로드캐스트 실패:', error);
    } finally {
      client.release();
    }
  }
}

export const turnManager = new TurnManager();
