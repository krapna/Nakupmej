document.addEventListener('DOMContentLoaded', function() {
    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

function syncOrders() {
    const localOrders = JSON.parse(localStorage.getItem('documents')) || [];

    fetch('/syncOrders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localOrders })
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem('documents', JSON.stringify(data.mergedOrders));
        renderOrders();
    })
    .catch(error => console.error('Chyba při synchronizaci objednávek:', error));
}

document.addEventListener('DOMContentLoaded', syncOrders);

    
    
    goToStrana2Button.addEventListener('click', function() {
        localStorage.removeItem('currentDocumentIndex');
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
        var documents = JSON.parse(localStorage.getItem('documents')) || [];
        ordersDiv.innerHTML = ''; // Clear existing orders
        documents.forEach(function(doc, index) {
            var orderDiv = document.createElement('div');
            orderDiv.className = 'order';
            orderDiv.textContent = `Dokument: ${doc.number}`;
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';

            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                localStorage.setItem('currentDocumentIndex', index);
                window.location.href = 'Strana2.html';
            });

            var openPageBtn = document.createElement('button');
            if (doc.borderColor === 'green') {
                openPageBtn.textContent = 'Strana 5';
                openPageBtn.style.backgroundColor = '#28a745'; // Barva tlačítka pro Strana 5
                openPageBtn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index); // Nastavíme index aktuálního dokumentu
                    window.location.href = 'Strana5.html';
                });
            } else {
                openPageBtn.textContent = 'Strana 3';
                openPageBtn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index); // Nastavíme index aktuálního dokumentu
                    window.location.href = 'Strana3.html';
                });
            }

            orderDiv.appendChild(viewBtn);
            orderDiv.appendChild(openPageBtn);

            if (doc.hasStrana4) {
                var openStrana4Btn = document.createElement('button');
                openStrana4Btn.textContent = 'Strana 4';
                openStrana4Btn.style.backgroundColor = 'red';
                openStrana4Btn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index);
                    window.location.href = 'Strana4.html';
                });
                orderDiv.appendChild(openStrana4Btn);
            }

            // Tlačítko odstranit, umístěné za všemi ostatními tlačítky
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                documents.splice(index, 1);
                localStorage.setItem('documents', JSON.stringify(documents));
                loadOrders();
            });

            orderDiv.appendChild(deleteBtn); // Přidáme tlačítko Odstranit až na konec

            ordersDiv.appendChild(orderDiv);
        });
    }

    loadOrders();
});
