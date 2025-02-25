// dataon.js
const fs = require('fs');
const path = require('path');

// Cesta k souboru, ve kterém budou data uložena
const dataFilePath = path.join(__dirname, 'data.json');

/**
 * Načte data z data.json.
 * Pokud soubor existuje, vrátí jeho obsah jako objekt (pole dokumentů).
 * Pokud neexistuje nebo dojde k chybě, vrátí prázdné pole.
 */
function loadData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const jsonData = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(jsonData);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Chyba při načítání dat:', error);
    return [];
  }
}

/**
 * Uloží předaný objekt (pole dokumentů) do souboru data.json.
 * Data jsou formátována s odsazením 2 mezery.
 */
function saveData(documents) {
  try {
    const jsonData = JSON.stringify(documents, null, 2);
    fs.writeFileSync(dataFilePath, jsonData, 'utf8');
  } catch (error) {
    console.error('Chyba při ukládání dat:', error);
  }
}

module.exports = { loadData, saveData };
