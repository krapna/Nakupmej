document.addEventListener('DOMContentLoaded', () => {
    // Připojení ke serveru přes socket.io a uložení do window.socket pro další použití
    const socket = io();
    window.socket = socket;

    socket.on('connect', () => {
        console.log('Připojeno k serveru pro synchronizaci pomocí socket.io');
        socket.emit('requestDocuments');
    });

    // Po obdržení aktualizovaného seznamu dokumentů vyvoláme vlastní událost "documentsUpdated"
    socket.on('updateDocuments', (documents) => {
        console.log('Synchronizace úspěšná:', documents);
        const updateEvent = new CustomEvent('documentsUpdated', { detail: documents });
        document.dispatchEvent(updateEvent);
    });
});
