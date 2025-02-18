document.addEventListener('DOMContentLoaded', function() {
    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

    let documents = [];

    // 📌 Funkce pro načtení objednávek ze serveru
    function loadOrders() {
        fetch('https://nakupmej.onrender.com/getOrders')
            .then(response => response.json())
            .then(data => {
                documents = data;
                renderOrders();
            })
            .catch(error => console.error('Chyba při načítání objednávek:', error));
    }

    // 📌 Funkce pro uložení objednávek na server
    function saveOrders() {
        fetch('https://nakupmej.onrender.com/saveOrders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orders: documents })
        })
        .catch(error => console.error('Chyba při ukládání objednávek:', error));
    }

    // 📌 Funkce pro vykreslení objednávek na stránce
    function renderOrders() {
        ordersDiv.innerHTML = ''; // Vymažeme existující objednávky
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
                    localStorage.setItem('currentDocumentIndex', index);
                    window.location.href = 'Strana5.html';
                });
            } else {
                openPageBtn.textContent = 'Strana 3';
                openPageBtn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index);
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

            // Tlačítko odstranění objednávky
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.addEventListener('click', function() {
                documents.splice(index, 1);
                saveOrders();
                renderOrders();
            });

            orderDiv.appendChild(deleteBtn);
            ordersDiv.appendChild(orderDiv);
        });
    }

    // 📌 Po kliknutí na "Přejít na Strana2" vytvoříme novou objednávku
    goToStrana2Button.addEventListener('click', function() {
        const newDocument = {
            number: Math.floor(Math.random() * 1000),
            borderColor: 'blue'
        };
        documents.push(newDocument);
        saveOrders();
        window.location.href = 'Strana2.html';
    });

    // 📌 Funkce pro hledání objednávek
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

    loadOrders(); // 📌 Načteme objednávky při načtení stránky
});
