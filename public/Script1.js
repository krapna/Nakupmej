// Script1.js

document.addEventListener('DOMContentLoaded', function() {
    const goToStrana2Button = document.getElementById('goToStrana2');
    const searchButton = document.getElementById('searchBtn');
    const packageNumberInput = document.getElementById('packageNumber');
    const ordersDiv = document.getElementById('orders');

    // Po kliknutí na "Přejít na Stranu 2" přejdeme na Strana2.html
    // (Žádné ukládání do localStorage, aktuální dokument se bude předávat přes URL parametry)
    goToStrana2Button.addEventListener('click', function() {
        window.location.href = 'Strana2.html';
    });

    // Filtrování dokumentů na klientovi
    searchButton.addEventListener('click', function() {
        const searchValue = packageNumberInput.value.toLowerCase();
        const orders = document.querySelectorAll('.order');

        orders.forEach(order => {
            const orderText = order.textContent.toLowerCase();
            if (orderText.includes(searchValue)) {
                order.style.display = 'block';
            } else {
                order.style.display = 'none';
            }
        });
    });

    // Funkce pro načtení všech dokumentů ze serveru a vykreslení na stránku
    function loadOrders() {
        fetch('/api/documents')  // endpoint, kde server vrací JSON se seznamem dokumentů
            .then(response => {
                if (!response.ok) {
                    throw new Error('Chyba při načítání dokumentů ze serveru.');
                }
                return response.json();
            })
            .then(documents => {
                ordersDiv.innerHTML = ''; // Vyčistit obsah

                documents.forEach(doc => {
                    const orderDiv = document.createElement('div');
                    orderDiv.className = 'order';
                    orderDiv.textContent = `Dokument: ${doc.number || ''}`;
                    orderDiv.style.borderColor = doc.borderColor || 'blue';
                    orderDiv.style.backgroundColor = doc.borderColor || 'blue';

                    // Tlačítko "Zobrazit" - původně nastavovalo localStorage a přecházelo na Strana2.html
                    // Nyní přejdeme rovnou na Strana2.html a předáme ID dokumentu v URL parametru
                    const viewBtn = document.createElement('button');
                    viewBtn.textContent = 'Zobrazit';
                    viewBtn.addEventListener('click', function() {
                        window.location.href = 'Strana2.html?id=' + doc.id;
                    });

                    // Tlačítko, které se mění podle barvy dokumentu:
                    // - pokud je zelený, vede na Strana5
                    // - jinak vede na Strana3
                    const openPageBtn = document.createElement('button');
                    if (doc.borderColor === 'green') {
                        openPageBtn.textContent = 'Strana 5';
                        openPageBtn.style.backgroundColor = '#28a745';
                        openPageBtn.addEventListener('click', function() {
                            window.location.href = 'Strana5.html?id=' + doc.id;
                        });
                    } else {
                        openPageBtn.textContent = 'Strana 3';
                        openPageBtn.addEventListener('click', function() {
                            window.location.href = 'Strana3.html?id=' + doc.id;
                        });
                    }

                    orderDiv.appendChild(viewBtn);
                    orderDiv.appendChild(openPageBtn);

                    // Pokud dokument obsahuje příznak hasStrana4, zobrazíme tlačítko pro Strana4
                    if (doc.hasStrana4) {
                        const openStrana4Btn = document.createElement('button');
                        openStrana4Btn.textContent = 'Strana 4';
                        openStrana4Btn.style.backgroundColor = 'red';
                        openStrana4Btn.addEventListener('click', function() {
                            window.location.href = 'Strana4.html?id=' + doc.id;
                        });
                        orderDiv.appendChild(openStrana4Btn);
                    }

                    // Tlačítko "Odstranit" - volá DELETE /api/documents/:id
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Odstranit';
                    deleteBtn.addEventListener('click', function() {
                        fetch('/api/documents/' + doc.id, {
                            method: 'DELETE'
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Chyba při mazání dokumentu.');
                            }
                            // Po úspěšném smazání dokument znovu načteme
                            loadOrders();
                        })
                        .catch(err => console.error(err));
                    });

                    orderDiv.appendChild(deleteBtn);
                    ordersDiv.appendChild(orderDiv);
                });
            })
            .catch(error => console.error('Chyba při načítání dokumentů:', error));
    }

    // Načteme dokumenty hned po spuštění
    loadOrders();

    // Každých 5 vteřin znovu načteme dokumenty, aby se změny projevily "online"
    // Pro skutečnou realtime synchronizaci by bylo lepší použít např. WebSockety.
    setInterval(loadOrders, 5000);
});
