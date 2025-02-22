document.addEventListener('DOMContentLoaded', () => {
    syncWithServer();

    // Automatická detekce kliknutí na tlačítko Odstranit
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-button')) {
            const orderElement = event.target.closest('.order-item');
            if (orderElement) {
                const orderNumber = orderElement.dataset.orderNumber;
                removeOrder(orderNumber);
            }
        }
    });

    // Automatická synchronizace dat mezi zařízeními každé 3 sekundy
    setInterval(syncWithServer, 3000);
});

// Funkce pro synchronizaci dat – načte data ze serveru a aktualizuje UI
function syncWithServer() {
    fetch('/syncOrders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Odesíláme prázdný objekt, server vrátí aktuální data ze souboru
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sync successful:', data.mergedOrders);
        // Předpokládáme, že na stránce existuje element s id "ordersContainer"
        const container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = data.mergedOrders.map(order => `
                <div class="order-item" data-order-number="${order.number}">
                    Order: ${order.number} - ${order.supplier}
                    <button class="delete-button">Odstranit</button>
                </div>
            `).join('');
        }
    })
    .catch(error => console.error('Error syncing orders:', error));
}

// Funkce pro odstranění objednávky – odešle požadavek na server a po úspěchu obnoví data
function removeOrder(orderNumber) {
    fetch('/deleteOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: orderNumber })
    })
    .then(response => response.json())
    .then(data => {
         if (data.success) {
             console.log(`Order ${orderNumber} deleted.`);
             syncWithServer();
         } else {
             console.error('Error deleting order:', data.error);
         }
    })
    .catch(error => console.error('Error deleting order:', error));
}
