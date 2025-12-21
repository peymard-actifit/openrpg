// OpenRPG - Main JavaScript

function rollDice() {
  const resultEl = document.getElementById('dice-result');
  resultEl.classList.add('rolling');
  resultEl.textContent = '🎲';
  
  // Simulate rolling animation
  let rolls = 0;
  const maxRolls = 10;
  
  const rollInterval = setInterval(() => {
    const randomValue = Math.floor(Math.random() * 20) + 1;
    resultEl.textContent = `🎲 ${randomValue}`;
    rolls++;
    
    if (rolls >= maxRolls) {
      clearInterval(rollInterval);
      resultEl.classList.remove('rolling');
      
      const finalValue = Math.floor(Math.random() * 20) + 1;
      resultEl.textContent = `🎲 ${finalValue}`;
      
      // Add flavor text based on roll
      if (finalValue === 20) {
        resultEl.innerHTML = `🎲 <span style="color: #00ff00;">20</span><br><small>CRITIQUE !</small>`;
      } else if (finalValue === 1) {
        resultEl.innerHTML = `🎲 <span style="color: #ff0000;">1</span><br><small>Échec critique...</small>`;
      }
    }
  }, 80);
}

// Make function globally available
window.rollDice = rollDice;

console.log('🎲 OpenRPG loaded - Ready for adventure!');

