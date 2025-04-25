// Script6.js
document.addEventListener('DOMContentLoaded', () => {
  // najde kontejner pro seznam souborů
  const fileList = document.getElementById('fileList');
  if (!fileList) return;

  // vytvoří element pro zobrazení počtu
  const counterEl = document.createElement('div');
  counterEl.id = 'fileCount';
  counterEl.style.marginTop = '10px';
  fileList.parentNode.insertBefore(counterEl, fileList.nextSibling);

  // funkce pro aktualizaci čítače
  function updateCounter() {
    const count = fileList.children.length;
    counterEl.textContent = `Počet nahraných souborů: ${count}`;
  }

  // jednorázová inicializace podle již existujících položek
  updateCounter();

  // sledujeme změny v seznamu souborů (přidání / odstranění položek)
  const observer = new MutationObserver(updateCounter);
  observer.observe(fileList, { childList: true });
});
