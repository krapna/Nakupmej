document.addEventListener('DOMContentLoaded', function() {
    // Získáme socket. Pokud již onlineserv.js vytvořil socket a uložil ho do window.socket, použijeme jej.
    var socket = window.socket || io();

    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

    // Globální proměnná pro dokumenty, které jsou synchronizovány online
    var documents = [];

    // Posloucháme událost, kterou vyvolá onlineserv.js po synchronizaci
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        loadOrders();
    });

    // Po navázání spojení požádáme server o aktuální dokumenty
    socket.emit('requestDocuments');

    goToStrana2Button.addEventListener('click', function() {
        // Přejdeme na Stranu2 – index aktuálního dokumentu předáme přes query parametr (místo použití localStorage)
        window.location.href = 'Strana2.html';
    });

    searchButton.addEventListener('click', function() {
        var searchValue = packageNumberInput.value.toLowerCase();
        var orders = document.querySelectorAll('.order');

        orders.forEach(function(order) {
            var orderText = order.textContent.toLowerCase();
            if (orderText.includes(searchValue)) {
                order.style.display = 'block';
            } else {
                order.style.display = 'none';
            }
        });
    });

    function loadOrders() {
        ordersDiv.innerHTML = ''; // Vyčistíme stávající zobrazení objednávek
        documents.forEach(function(doc, index) {
            var orderDiv = document.createElement('div');
            orderDiv.className = 'order';
            orderDiv.textContent = `Dokument: ${doc.number}`;
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';

            // Tlačítko pro zobrazení detailu dokumentu – index předáme přes URL parametr
            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                window.location.href = 'Strana2.html?docIndex=' + index;
            });

            // Podle barvy dokumentu se rozhodneme, zda zobrazit tlačítko pro Stranu 3 nebo Stranu 5
            var openPageBtn = document.createElement('button');
            if (doc.borderColor === 'green') {
                openPageBtn.textContent = 'Strana 5';
                openPageBtn.style.backgroundColor = '#28a745';
                openPageBtn.addEventListener('click', function() {
                    window.location.href = 'Strana5.html?docIndex=' + index;
                });
            } else {
                openPageBtn.textContent = 'Strana 3';
                openPageBtn.addEventListener('click', function() {
                    window.location.href = 'Strana3.html?docIndex=' + index;
                });
            }

            orderDiv.appendChild(viewBtn);
            orderDiv.appendChild(openPageBtn);

            // Pokud má dokument vyplněnou Stranu4, zobrazíme i tlačítko pro Stranu 4
            if (doc.hasStrana4) {
                var openStrana4Btn = document.createElement('button');
                openStrana4Btn.textContent = 'Strana 4';
                openStrana4Btn.style.backgroundColor = 'red';
                openStrana4Btn.addEventListener('click', function() {
                    window.location.href = 'Strana4.html?docIndex=' + index;
                });
                orderDiv.appendChild(openStrana4Btn);
            }

            // Tlačítko pro odstranění dokumentu – po odstranění odešleme aktualizovaný stav na server
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                documents.splice(index, 1);
                socket.emit('updateDocuments', documents);
            });

            orderDiv.appendChild(deleteBtn);
            ordersDiv.appendChild(orderDiv);
        });
    }
});
