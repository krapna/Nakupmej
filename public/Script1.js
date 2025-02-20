document.addEventListener('DOMContentLoaded', function() {
    var goToStrana2Button = document.getElementById('goToStrana2');
    var searchButton = document.getElementById('searchBtn');
    var packageNumberInput = document.getElementById('packageNumber');
    var ordersDiv = document.getElementById('orders');

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
        ordersDiv.innerHTML = ''; // Vymazání existujících objednávek

        documents.forEach(function(doc, index) {
            var orderDiv = document.createElement('div');
            orderDiv.className = 'order';
            orderDiv.style.borderColor = doc.borderColor || 'blue';
            orderDiv.style.backgroundColor = doc.borderColor || 'blue';
            orderDiv.style.display = 'flex';
            orderDiv.style.justifyContent = 'space-between';
            orderDiv.style.alignItems = 'center';
            orderDiv.style.padding = '5px';

            var orderText = document.createElement('span');
            orderText.textContent = `Dokument: ${doc.number}`;
            orderText.style.flex = '1'; // Zabírá dostupný prostor

            var buttonsContainer = document.createElement('div'); // Kontejner na tlačítka

            var viewBtn = document.createElement('button');
            viewBtn.textContent = 'Zobrazit';
            viewBtn.addEventListener('click', function() {
                localStorage.setItem('currentDocumentIndex', index);
                window.location.href = 'Strana2.html';
            });

            var openPageBtn = document.createElement('button');
            if (doc.borderColor === 'green') {
                openPageBtn.textContent = 'K předání';
                openPageBtn.style.backgroundColor = '#28a745';
                openPageBtn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index);
                    window.location.href = 'Strana5.html';
                });
            } else {
                openPageBtn.textContent = 'Nákup';
                openPageBtn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index);
                    window.location.href = 'Strana3.html';
                });
            }

            buttonsContainer.appendChild(viewBtn);
            buttonsContainer.appendChild(openPageBtn);

            if (doc.hasStrana4) {
                var openStrana4Btn = document.createElement('button');
                openStrana4Btn.textContent = 'Kvalita';
                openStrana4Btn.style.backgroundColor = 'red';
                openStrana4Btn.addEventListener('click', function() {
                    localStorage.setItem('currentDocumentIndex', index);
                    window.location.href = 'Strana4.html';
                });
                buttonsContainer.appendChild(openStrana4Btn);
            }

            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Odstranit';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.addEventListener('click', function() {
                documents.splice(index, 1);
                localStorage.setItem('documents', JSON.stringify(documents));
                loadOrders();
            });

            orderDiv.appendChild(orderText);
            orderDiv.appendChild(buttonsContainer);
            orderDiv.appendChild(deleteBtn);

            ordersDiv.appendChild(orderDiv);
        });
    }

    loadOrders();
});
