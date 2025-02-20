document.addEventListener('DOMContentLoaded', () => {
    syncWithServer();
    setInterval(syncWithServer, 100); // 📌 Automatická synchronizace každých 5 sekund

    // 📌 Automatická detekce kliknutí na tlačítko Odstranit
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-button')) {
            const orderElement = event.target.closest('.order-item');
            if (orderElement) {
                const orderNumber = orderElement.dataset.orderNumber;
                removeOrder(orderNumber);
            }
        }
    });
});

// 📌 Synchronizace dat mezi localStorage a serverem
function syncWithServer() {
    let localOrders = JSON.parse(localStorage.getItem('documents')) || [];

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

// 📌 Odstranění objednávky na serveru i localStorage
function removeOrder(orderNumber) {
    fetch('/deleteOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: orderNumber })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Objednávka ${orderNumber} byla úspěšně odstraněna.`);
            
            // 📌 Odstranění objednávky i z localStorage
            let localOrders = JSON.parse(localStorage.getItem('documents')) || [];
            localOrders = localOrders.filter(order => order.number !== orderNumber);
            localStorage.setItem('documents', JSON.stringify(localOrders));

            syncWithServer(); // 📌 Znovu načíst data ze serveru
        } else {
            console.error('Chyba při mazání objednávky:', data.error);
        }
    })
    .catch(error => console.error('Chyba při komunikaci se serverem:', error));
}
