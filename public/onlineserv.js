document.addEventListener('DOMContentLoaded', () => {
    syncLocalStorageWithServer();
    setInterval(syncLocalStorageWithServer, 5000); // 📌 Každých 5 sekund se provede synchronizace
});

function syncLocalStorageWithServer() {
    let localOrders = JSON.parse(localStorage.getItem('documents')) || [];

    // 📌 Odeslání dat na server
    fetch('/syncOrders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localOrders })
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem('documents', JSON.stringify(data.mergedOrders));
        console.log('Synchronizace úspěšná:', data.mergedOrders);
    })
    .catch(error => console.error('Chyba při synchronizaci objednávek:', error));
}
