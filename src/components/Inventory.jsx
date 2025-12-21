import { useState } from 'react'
import '../styles/inventory.css'

export default function Inventory({ items = [], isOpen, onClose, onDiscardItem }) {
  const [selectedItem, setSelectedItem] = useState(null)

  if (!isOpen) return null

  function handleDiscard(index) {
    if (onDiscardItem) {
      onDiscardItem(index)
    }
    setSelectedItem(null)
  }

  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-modal" onClick={e => e.stopPropagation()}>
        <div className="inventory-header">
          <h2>🎒 Inventaire</h2>
          <div className="inventory-meta">
            <span className="item-count">{items.length} objets</span>
            {totalValue > 0 && <span className="total-value">💰 {totalValue}</span>}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="inventory-body">
          {items.length === 0 ? (
            <div className="inventory-empty">
              <div className="empty-icon">📦</div>
              <p>Votre sac est vide</p>
              <small>Les objets trouvés apparaîtront ici</small>
            </div>
          ) : (
            <div className="inventory-list">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className={`inventory-row ${selectedItem === index ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(selectedItem === index ? null : index)}
                >
                  <span className="item-icon">{item.icon || '📦'}</span>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-desc">{item.description}</span>
                  </div>
                  {item.value > 0 && (
                    <span className="item-value">💰{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedItem !== null && items[selectedItem] && (
            <div className="item-actions">
              <div className="selected-item-details">
                <span className="detail-icon">{items[selectedItem].icon}</span>
                <div>
                  <strong>{items[selectedItem].name}</strong>
                  {items[selectedItem].value > 0 && (
                    <span className="detail-value">Valeur: {items[selectedItem].value} pièces</span>
                  )}
                </div>
              </div>
              <button 
                className="discard-btn"
                onClick={() => handleDiscard(selectedItem)}
              >
                🗑️ Jeter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant de preview au hover
export function InventoryPreview({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="inventory-preview">
        <span className="preview-empty">Sac vide</span>
      </div>
    )
  }

  return (
    <div className="inventory-preview">
      {items.slice(0, 5).map((item, i) => (
        <div key={i} className="preview-item">
          <span>{item.icon || '📦'}</span>
          <span>{item.name}</span>
        </div>
      ))}
      {items.length > 5 && (
        <div className="preview-more">+{items.length - 5} autres...</div>
      )}
    </div>
  )
}
