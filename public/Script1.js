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
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';

            // Tlačítko "Zobrazit"
            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                window.location.href = 'Strana2.html?docIndex=' + index;
            });
            orderDiv.appendChild(viewBtn);

            // Další krok (Nákup / Kvalita / K předání)
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

            // Tlačítko "Odstranit"
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                if (confirm("Opravdu chcete odstranit tento dokument?")) {
                    documents.splice(index, 1);
                    socket.emit('updateDocuments', documents);
                }
            });
            orderDiv.appendChild(deleteBtn);

            // Jméno příjemce
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

            // **Umístění** (pole z Strana2)
            if ((doc.borderColor === 'gray' || doc.borderColor === 'green') && Array.isArray(doc.location) && doc.location.length) {
                var locationBtn = document.createElement('button');
                locationBtn.textContent = doc.location.join(', ');
                locationBtn.style.backgroundColor = 'gray';
                locationBtn.style.color = 'white';
                locationBtn.style.border = 'none';
                locationBtn.style.cursor = 'default';
                locationBtn.disabled = true;
                orderDiv.appendChild(locationBtn);
            }

            // **Dodavatel** (ze Strana2 nebo doplněný ve Strana3)
            if ((doc.borderColor === 'gray' || doc.borderColor === 'green') && doc.supplier) {
                var supplierBtn = document.createElement('button');
                supplierBtn.textContent = doc.supplier;
                supplierBtn.style.backgroundColor = 'gray';
                supplierBtn.style.color = 'white';
                supplierBtn.style.border = 'none';
                supplierBtn.style.cursor = 'default';
                supplierBtn.disabled = true;
                orderDiv.appendChild(supplierBtn);
            }

            ordersDiv.appendChild(orderDiv);
        });
    }
});
