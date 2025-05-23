// Script1.js - aktualizováno pro podporu zobrazení tlačítka „resume (X)“ pro rozpracované Strana3 dokumenty
document.addEventListener('DOMContentLoaded', function() {
    var socket = window.socket || io();
    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

    // Globální pole dokumentů získaných ze serveru
    var documents = [];

    // Požádáme server o aktuální data
    socket.emit('requestDocuments');

    // Aktualizace objednávek po přijetí dat
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        loadOrders();
    });

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

        // Seřazení dokumentů podle barvy: zelené → oranžové → modré → šedé
        var colorOrder = { 'green': 1, 'orange': 2, 'blue': 3, 'gray': 4 };
        var sorted = documents
            .map(function(doc, index) { return { doc: doc, index: index }; })
            .sort(function(a, b) {
                var colorA = a.doc.borderColor || 'blue';
                var colorB = b.doc.borderColor || 'blue';
                var rankA = colorOrder[colorA] || 5;
                var rankB = colorOrder[colorB] || 5;
                if (rankA !== rankB) return rankA - rankB;
                return a.index - b.index;
            });

        // Vykreslení ve správném pořadí
        sorted.forEach(function(item) {
            var doc = item.doc;
            var index = item.index;

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

            // Tlačítko "Resume" (X) pro rozpracované Strana3
            if (doc.draftStrana3) {
                var resumeBtn = document.createElement('button');
                resumeBtn.textContent = 'X';
                resumeBtn.style.backgroundColor = 'gray';
                resumeBtn.style.color = 'white';
                resumeBtn.style.border = 'none';
                resumeBtn.style.cursor = 'pointer';
                resumeBtn.addEventListener('click', function() {
                    window.location.href = 'Strana3.html?docIndex=' + index;
                });
                orderDiv.appendChild(resumeBtn);
            }

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

            // Umístění
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

            // Dodavatel
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
