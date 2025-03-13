document.addEventListener('DOMContentLoaded', function() {
    var socket = window.socket || io();
    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

    // Globální pole dokumentů získaných ze serveru
    var documents = [];

    // Aktualizace objednávek po přijetí dat
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        loadOrders();
    });

    // Požádáme server o aktuální data
    socket.emit('requestDocuments');

    goToStrana2Button.addEventListener('click', function() {
        window.location.href = 'Strana2.html';
    });

    searchButton.addEventListener('click', function() {
        var searchValue = packageNumberInput.value.toLowerCase();
        var orders = document.querySelectorAll('.order');
        orders.forEach(function(order) {
            var orderText = order.textContent.toLowerCase();
            order.style.display = orderText.includes(searchValue) ? 'block' : 'none';
        });
    });

    function loadOrders() {
        ordersDiv.innerHTML = ''; // Vyčistíme předchozí zobrazení
        documents.forEach(function(doc, index) {
            var orderDiv = document.createElement('div');
            orderDiv.className = 'order';
            orderDiv.textContent = 'Dokument: ' + doc.number;
            // Použijeme vlastnost borderColor – pokud byla nastavena, dokument se zobrazí příslušně
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';

            // Tlačítko "Zobrazit" – zobrazí detail dokumentu
            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                window.location.href = 'Strana2.html?docIndex=' + index;
            });
            orderDiv.appendChild(viewBtn);

            // Podle vstupní kontroly zobrazíme další tlačítka
            if (doc.hasStrana4) {
                if (doc.borderColor === 'orange') {
                    var openBtn = document.createElement('button');
                    openBtn.textContent = 'Kvalita';
                    openBtn.style.backgroundColor = 'red';
                    openBtn.addEventListener('click', function() {
                        window.location.href = 'Strana4.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(openBtn);
                } else if (doc.borderColor === 'green') {
                    var openBtn = document.createElement('button');
                    openBtn.textContent = 'K předání';
                    openBtn.style.backgroundColor = '#28a745';
                    openBtn.addEventListener('click', function() {
                        window.location.href = 'Strana5.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(openBtn);
                }
            } else {
                var openBtn = document.createElement('button');
                openBtn.textContent = 'Nákup';
                openBtn.addEventListener('click', function() {
                    window.location.href = 'Strana3.html?docIndex=' + index;
                });
                orderDiv.appendChild(openBtn);
            }

            // Tlačítko pro odstranění dokumentu s potvrzením
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                if (confirm("Opravdu chcete odstranit tento dokument?")) {
                    documents.splice(index, 1);
                    socket.emit('updateDocuments', documents);
                }
            });
            orderDiv.appendChild(deleteBtn);

            // Pokud je dokument dokončený (borderColor === "gray") a má vyplněné pole recipientName,
            // přidáme extra tlačítko s textem z tohoto pole (informační, neaktivní)
            if ((doc.borderColor === 'gray' || doc.borderColor === 'green') && doc.recipientName) {
                var recipientBtn = document.createElement('button');
                recipientBtn.textContent = doc.recipientName;
                recipientBtn.style.backgroundColor = 'gray';
                recipientBtn.style.color = 'white';
                recipientBtn.style.border = 'none';
                recipientBtn.style.cursor = 'default';
                recipientBtn.disabled = true;
                orderDiv.appendChild(recipientBtn);
            }

            ordersDiv.appendChild(orderDiv);
        });
    }
});
