import './HandCards.css';

interface Card {
  id: string;
  name: string;
  cost: number;
  effects: any;
}

interface Props {
  cards: Card[];
}

function HandCards({ cards }: Props) {
  return (
    <div className="hand-cards card">
      <h3>내 카드 ({cards.length}장)</h3>
      
      <div className="cards-list">
        {cards.length === 0 ? (
          <p className="empty-message">카드가 없습니다</p>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-name">{card.name}</div>
              <div className="card-cost">{card.cost.toLocaleString()}원</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HandCards;
