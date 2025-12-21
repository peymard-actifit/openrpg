import { useState } from 'react'
import '../styles/inventory.css'

export default function Inventory({ items = [], isOpen, onClose }) {
  const [selectedItem, setSelectedItem] = useState(null)

  if (!isOpen) return null

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-panel" onClick={e => e.stopPropagation()}>
        <div className="inventory-header">
          <h2>🎒 Inventaire</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="inventory-content">
          {items.length === 0 ? (
            <div className="inventory-empty">
              <p>Votre inventaire est vide</p>
              <small>Les objets trouvés apparaîtront ici</small>
            </div>
          ) : (
            <div className="inventory-grid">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className={`inventory-item ${selectedItem === index ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(selectedItem === index ? null : index)}
                >
                  <span className="item-icon">{item.icon || '📦'}</span>
                  <span className="item-name">{item.name}</span>
                </div>
              ))}
            </div>
          )}

          {selectedItem !== null && items[selectedItem] && (
            <div className="item-details">
              <h3>{items[selectedItem].icon} {items[selectedItem].name}</h3>
              <p className="item-description">{items[selectedItem].description}</p>
              {items[selectedItem].effects && (
                <div className="item-effects">
                  <strong>Effets:</strong> {items[selectedItem].effects}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

