// Script1.js – kompletní přepis včetně úpravy stylu disabled tlačítek pro dodavatele, příjemce a umístění
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

    // Přechod na Strana2 pro nový příjem
    goToStrana2Button.addEventListener('click', function() {
        window.location.href = 'Strana2.html';
    });

    // Filtrování záznamů podle čísla
    searchButton.addEventListener('click', function() {
        var searchValue = packageNumberInput.value.toLowerCase();
        var orders = document.querySelectorAll('.order');
        orders.forEach(function(order) {
            var orderText = order.textContent.toLowerCase();
            order.style.display = orderText.includes(searchValue) ? 'block' : 'none';
        });
    });

    // Funkce pro vykreslení seznamu objednávek/dokumentů
    function loadOrders() {
        ordersDiv.innerHTML = '';
        var colorOrder = { green: 1, orange: 2, blue: 3, gray: 4, purple: 5 };
        var sorted = documents
            .map(function(doc, i) { return { doc: doc, index: i }; })
            .sort(function(a, b) {
                var rA = colorOrder[a.doc.borderColor] || colorOrder.blue;
                var rB = colorOrder[b.doc.borderColor] || colorOrder.blue;
                return rA - rB;
            });

        sorted.forEach(function(item) {
            var doc = item.doc, index = item.index;
            var orderDiv = document.createElement('div');
            orderDiv.className = 'order';
            orderDiv.textContent = 'Dokument: ' + doc.number;
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';

            // Zobrazit detail (Strana2)
            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                window.location.href = 'Strana2.html?docIndex=' + index;
            });
            orderDiv.appendChild(viewBtn);

            // Další krok: Sklad / Nákup / Kvalita / K předání
            if (doc.hasStrana4) {
                if (doc.borderColor === 'orange') {
                    var kvalitaBtn = document.createElement('button');
                    kvalitaBtn.textContent = 'Kvalita';
                    kvalitaBtn.style.backgroundColor = 'red';
                    kvalitaBtn.addEventListener('click', function() {
                        window.location.href = 'Strana4.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(kvalitaBtn);
                } else if (doc.borderColor === 'green') {
                    var predaniBtn = document.createElement('button');
                    predaniBtn.textContent = 'K předání';
                    predaniBtn.style.backgroundColor = '#28a745';
                    predaniBtn.addEventListener('click', function() {
                        window.location.href = 'Strana5.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(predaniBtn);
                }
            } else {
                // Pokud Strana2 je vyplněná, ale Strana2,5 ještě ne
                if (doc.stage2Completed && !doc.stage25Completed) {
                    var skladBtn = document.createElement('button');
                    skladBtn.textContent = 'Sklad';
                    skladBtn.style.backgroundColor = 'purple';
                    skladBtn.style.color = 'white';
                    skladBtn.addEventListener('click', function() {
                        window.location.href = 'Strana2,5.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(skladBtn);
                } else {
                    // Jinak klasický Nákup (Strana3)
                    var nakupBtn = document.createElement('button');
                    nakupBtn.textContent = 'Nákup';
                    nakupBtn.addEventListener('click', function() {
                        window.location.href = 'Strana3.html?docIndex=' + index;
                    });
                    orderDiv.appendChild(nakupBtn);
                }
            }

            // Odstranit dokument
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                if (confirm('Opravdu chcete odstranit tento dokument?')) {
                    documents.splice(index, 1);
                    socket.emit('updateDocuments', documents);
                }
            });
            orderDiv.appendChild(deleteBtn);

            // Resume (X) pro nedokončenou Strana3
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

            // ---- Nově: Tlačítka se statickými texty (disabled) ----

            // 1) Dodavatel
            var supplierBtn = document.createElement('button');
            supplierBtn.textContent = doc.supplier || '';
            supplierBtn.disabled = true;
            supplierBtn.style.cursor = 'default';
            supplierBtn.style.backgroundColor = 'gray';
            supplierBtn.style.color = 'white';
            supplierBtn.style.border = 'none';
            orderDiv.appendChild(supplierBtn);

            // 2) Příjemce (z Strana2,5 nebo Strana3)
            var recipientBtn = document.createElement('button');
            recipientBtn.textContent = doc.recipientName || '';
            recipientBtn.disabled = true;
            recipientBtn.style.cursor = 'default';
            recipientBtn.style.backgroundColor = 'gray';
            recipientBtn.style.color = 'white';
            recipientBtn.style.border = 'none';
            orderDiv.appendChild(recipientBtn);

            // 3) Umístění (z políčka Strana2)
            var locationText = '';
            if (Array.isArray(doc.location)) {
                locationText = doc.location.join(', ');
            }
            var locationBtn = document.createElement('button');
            locationBtn.textContent = locationText;
            locationBtn.disabled = true;
            locationBtn.style.cursor = 'default';
            locationBtn.style.backgroundColor = 'gray';
            locationBtn.style.color = 'white';
            locationBtn.style.border = 'none';
            orderDiv.appendChild(locationBtn);

            ordersDiv.appendChild(orderDiv);
        });
    }
});
