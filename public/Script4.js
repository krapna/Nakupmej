document.addEventListener('DOMContentLoaded', function() {
    // Inicializace socket.io – pokud onlineserv.js již vytvořil socket, použijeme window.socket, jinak vytvoříme nový
    const socket = window.socket || io();

    // Získání parametru docIndex z URL
    const urlParams = new URLSearchParams(window.location.search);
    const docIndex = urlParams.get('docIndex');

    // Globální proměnná pro synchronizaci dokumentů
    let documents = [];
    // Aktuální dokument, který budeme editovat
    let currentDocument = {};

    // Elementy formuláře
    const saveButton = document.getElementById('saveBtn');
    const endButton = document.getElementById('endBtn');
    const supplierInput = document.getElementById('supplier');
    const documentNumberInput = document.getElementById('documentNumber');
    const noteInput = document.getElementById('note');
    const controlByInput = document.getElementById('controlBy');
    const dateInput = document.getElementById('date');
    const resultInput = document.getElementById('result');

    // Funkce pro načtení dat aktuálního dokumentu do formuláře
    function loadFormData() {
        if (!currentDocument) return;
        documentNumberInput.value = currentDocument.number || '';
        supplierInput.value = currentDocument.supplier || '';
        
        const physicalInput = document.querySelector(`input[name="physical"][value="${currentDocument.physical || ''}"]`);
        if (physicalInput) {
            physicalInput.checked = true;
        }
        const chemicalInput = document.querySelector(`input[name="chemical"][value="${currentDocument.chemical || ''}"]`);
        if (chemicalInput) {
            chemicalInput.checked = true;
        }
        const materialInput = document.querySelector(`input[name="material"][value="${currentDocument.material || ''}"]`);
        if (materialInput) {
            materialInput.checked = true;
        }
        const documentationInput = document.querySelector(`input[name="documentation"][value="${currentDocument.documentation || ''}"]`);
        if (documentationInput) {
            documentationInput.checked = true;
        }
        noteInput.value = currentDocument.note || '';
        controlByInput.value = currentDocument.controlBy || '';
        dateInput.value = currentDocument.date || '';
        resultInput.value = currentDocument.result || '';
    }

    // Při obdržení synchronizovaných dokumentů ze serveru aktualizujeme globální proměnnou
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
            loadFormData();
        }
    });

    // Po navázání spojení požádáme server o aktuální dokumenty
    socket.emit('requestDocuments');

    // Obsluha tlačítka "Hotovo" – uložení dat z formuláře
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        const inspectionData = {
            number: documentNumberInput.value, // Číslo dokumentu
            supplier: supplierInput.value,       // Dodavatel
            physical: document.querySelector('input[name="physical"]:checked')?.value,
            chemical: document.querySelector('input[name="chemical"]:checked')?.value,
            material: document.querySelector('input[name="material"]:checked')?.value,
            documentation: document.querySelector('input[name="documentation"]:checked')?.value,
            note: noteInput.value,
            controlBy: controlByInput.value,
            date: dateInput.value,
            result: resultInput.value,
            hasStrana4: true // Označení, že byla vyplněna vstupní kontrola
        };

        // Pokud máme existující dokument, aktualizujeme jej
        if (docIndex !== null) {
            currentDocument = { ...currentDocument, ...inspectionData };
            // Nastavení barvy dokumentu na zelenou, aby bylo jasné, že vstupní kontrola proběhla
            currentDocument.borderColor = 'green';
            documents[docIndex] = currentDocument;
        }

        // Odeslání aktualizovaného pole dokumentů na server
        socket.emit('updateDocuments', documents);

        // Přesměrování na přehled objednávek
        window.location.href = 'Strana1.html';
    });

    // Obsluha tlačítka "Konec" – přesměruje zpět na přehled objednávek
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
