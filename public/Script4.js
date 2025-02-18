document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var supplierInput = document.getElementById('supplier'); // Dodavatel input
    var documentNumberInput = document.getElementById('documentNumber'); // Číslo dokumentu input

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

        // Předvyplnění čísla dokumentu a dodavatele
        documentNumberInput.value = currentDocument.number || ''; 
        supplierInput.value = currentDocument.supplier || ''; 

        function setChecked(name, value) {
            var input = document.querySelector(`input[name="${name}"][value="${value || ''}"]`);
            if (input) {
                input.checked = true;
            }
        }

        setChecked("physical", currentDocument.physical);
        setChecked("chemical", currentDocument.chemical);
        setChecked("material", currentDocument.material);
        setChecked("documentation", currentDocument.documentation);

        document.getElementById('note').value = currentDocument.note || '';
        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';
    }

    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        if (currentDocumentIndex === null) return;
        let currentDocument = documents[currentDocumentIndex];

        var inspectionData = {
            number: documentNumberInput.value, 
            supplier: supplierInput.value, 
            physical: document.querySelector('input[name="physical"]:checked')?.value,
            chemical: document.querySelector('input[name="chemical"]:checked')?.value,
            material: document.querySelector('input[name="material"]:checked')?.value,
            documentation: document.querySelector('input[name="documentation"]:checked')?.value,
            note: document.getElementById('note').value,
            controlBy: document.getElementById('controlBy').value,
            date: document.getElementById('date').value,
            result: document.getElementById('result').value,
            hasStrana4: true 
        };

        documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...inspectionData };
        documents[currentDocumentIndex].borderColor = 'green'; 

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
