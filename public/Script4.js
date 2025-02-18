document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var supplierInput = document.getElementById('supplier'); // Dodavatel input
    var documentNumberInput = document.getElementById('documentNumber'); // Číslo dokumentu input

    var currentDocumentIndex = localStorage.getItem('currentDocumentIndex');
    var documents = JSON.parse(localStorage.getItem('documents')) || [];
    var currentDocument = currentDocumentIndex !== null ? documents[currentDocumentIndex] : {};

    // Load existing form data
    function loadFormData() {
        if (!currentDocument) return;

        // Předvyplnění čísla dokumentu a dodavatele
        documentNumberInput.value = currentDocument.number || ''; // Načtení čísla dokumentu
        supplierInput.value = currentDocument.supplier || ''; // Načtení dodavatele

        // Kontrola, zda prvek existuje, než nastavíme jeho vlastnost 'checked'
        var physicalInput = document.querySelector(`input[name="physical"][value="${currentDocument.physical || ''}"]`);
        if (physicalInput) {
            physicalInput.checked = true;
        }

        var chemicalInput = document.querySelector(`input[name="chemical"][value="${currentDocument.chemical || ''}"]`);
        if (chemicalInput) {
            chemicalInput.checked = true;
        }

        var materialInput = document.querySelector(`input[name="material"][value="${currentDocument.material || ''}"]`);
        if (materialInput) {
            materialInput.checked = true;
        }

        var documentationInput = document.querySelector(`input[name="documentation"][value="${currentDocument.documentation || ''}"]`);
        if (documentationInput) {
            documentationInput.checked = true;
        }

        document.getElementById('note').value = currentDocument.note || '';
        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';
    }

    if (currentDocumentIndex !== null) {
        loadFormData();
    }

    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        var inspectionData = {
            number: documentNumberInput.value, // Uložení čísla dokumentu
            supplier: supplierInput.value, // Uložení dodavatele
            physical: document.querySelector('input[name="physical"]:checked')?.value,
            chemical: document.querySelector('input[name="chemical"]:checked')?.value,
            material: document.querySelector('input[name="material"]:checked')?.value,
            documentation: document.querySelector('input[name="documentation"]:checked')?.value,
            note: document.getElementById('note').value,
            controlBy: document.getElementById('controlBy').value,
            date: document.getElementById('date').value,
            result: document.getElementById('result').value,
            hasStrana4: true // Přidání označení, že dokument má vyplněnou stranu 4
        };

        if (currentDocumentIndex !== null) {
            documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...inspectionData };
            documents[currentDocumentIndex].borderColor = 'green'; // Změna barvy dokumentu na zelenou
        }

        localStorage.setItem('documents', JSON.stringify(documents));
        localStorage.removeItem('currentDocumentIndex');

        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
