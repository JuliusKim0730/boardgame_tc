import { useState } from 'react';
import RulesModal from './RulesModal';
import CardListModal from './CardListModal';
import './Header.css';

interface HeaderProps {
  showHeader?: boolean;
}

function Header({ showHeader = true }: HeaderProps) {
  const [showRules, setShowRules] = useState(false);
  const [showCardList, setShowCardList] = useState(false);

  if (!showHeader) return null;

  return (
    <>
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">열네 밤의 꿈</h1>
          <nav className="header-nav">
            <button 
              className="nav-button"
              onClick={() => setShowRules(true)}
            >
              📖 게임 규칙
            </button>
            <button 
              className="nav-button"
              onClick={() => setShowCardList(true)}
            >
              🎴 카드 리스트
            </button>
          </nav>
        </div>
      </header>

      <RulesModal 
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      <CardListModal 
        isOpen={showCardList}
        onClose={() => setShowCardList(false)}
      />
    </>
  );
}

export default Header;
