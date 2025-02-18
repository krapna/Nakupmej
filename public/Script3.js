document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var documentNumberInput = document.getElementById('documentNumber');

    let documents = [];
    let currentDocumentIndex = null;

    // 📌 Funkce pro načtení objednávek ze serveru
    function loadOrders() {
        fetch('https://nakupmej.onrender.com/getOrders')
            .then(response => response.json())
            .then(data => {
                documents = data;
                currentDocumentIndex = localStorage.getItem('currentDocumentIndex');
                loadFormData();
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

    // 📌 Funkce pro načtení dat formuláře
    function loadFormData() {
        if (currentDocumentIndex === null || !documents[currentDocumentIndex]) return;

        let currentDocument = documents[currentDocumentIndex];

        documentNumberInput.value = currentDocument.number || ''; 
        document.getElementById('orderNumber').value = currentDocument.orderNumber || '';
        document.getElementById('supplier').value = currentDocument.supplier || ''; 
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value = currentDocument.deliveryDate || '';
        document.getElementById('price').value = currentDocument.price || '';

        function setChecked(name, value) {
            var input = document.querySelector(`input[name="${name}"][value="${value || ''}"]`);
            if (input) {
                input.checked = true;
            }
        }

        setChecked("timeliness", currentDocument.timeliness);
        setChecked("systemCheck", currentDocument.systemCheck);
        setChecked("communication", currentDocument.communication);

        if (currentDocument.goodsType) {
            currentDocument.goodsType.forEach(function(type) {
                document.querySelector(`input[name="goodsType"][value="${type}"]`).checked = true;
            });
        }

        document.getElementById('note').value = currentDocument.note || '';
        setChecked("entryControl", currentDocument.entryControl);
    }

    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        if (currentDocumentIndex === null) return;
        let currentDocument = documents[currentDocumentIndex];

        var entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;

        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }

        var orderData = {
            entryControl: entryControlValue,
            number: documentNumberInput.value, 
            orderNumber: document.getElementById('orderNumber').value,
            supplier: document.getElementById('supplier').value,
            confirmedDeliveryDate: document.getElementById('confirmedDeliveryDate').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            price: document.getElementById('price').value,
            timeliness: document.querySelector('input[name="timeliness"]:checked')?.value,
            systemCheck: document.querySelector('input[name="systemCheck"]:checked')?.value,
            communication: document.querySelector('input[name="communication"]:checked')?.value,
            goodsType: Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value),
            note: document.getElementById('note').value
        };

        documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...orderData };

        if (entryControlValue === 'Ano') {
            documents[currentDocumentIndex].borderColor = 'orange';
            documents[currentDocumentIndex].hasStrana4 = true;
        } else if (entryControlValue === 'Ne') {
            documents[currentDocumentIndex].borderColor = 'green';
        }

        saveOrders(); // 📌 Uložit na server
        localStorage.removeItem('currentDocumentIndex');

        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        localStorage.removeItem('currentDocumentIndex');
        window.location.href = 'Strana1.html';
    });

    loadOrders(); // 📌 Načtení objednávek při načtení stránky
});
