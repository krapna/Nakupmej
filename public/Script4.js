// Script4.js
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
    const documentNumberInput = document.getElementById('documentNumber');
    const supplierInput       = document.getElementById('supplier');
    const noteInput           = document.getElementById('note');
    const controlByInput      = document.getElementById('controlBy');
    const dateInput           = document.getElementById('date');
    const resultInput         = document.getElementById('result');
    const saveButton          = document.getElementById('saveBtn');
    const endButton           = document.getElementById('endBtn');

    // Pomocná funkce pro výpis odkazů na nahrané soubory
    function addFileToList(fileName, fileContent) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.textContent = fileName;
        link.target = '_blank';
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Funkce pro načtení dat aktuálního dokumentu do formuláře
    function loadFormData() {
        if (!currentDocument) return;
        documentNumberInput.value = currentDocument.number || '';
        supplierInput.value       = currentDocument.supplier || '';

        const physicalInput = document.querySelector(`input[name="physical"][value="${currentDocument.physical || ''}"]`);
        if (physicalInput) physicalInput.checked = true;
        const chemicalInput = document.querySelector(`input[name="chemical"][value="${currentDocument.chemical || ''}"]`);
        if (chemicalInput) chemicalInput.checked = true;
        const materialInput = document.querySelector(`input[name="material"][value="${currentDocument.material || ''}"]`);
        if (materialInput) materialInput.checked = true;
        const documentationInput = document.querySelector(`input[name="documentation"][value="${currentDocument.documentation || ''}"]`);
        if (documentationInput) documentationInput.checked = true;

        noteInput.value      = currentDocument.note || '';
        controlByInput.value = currentDocument.controlBy || '';
        dateInput.value      = currentDocument.date || '';
        resultInput.value    = currentDocument.result || '';

        // Zobrazení nahraných souborů
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        if (Array.isArray(currentDocument.files)) {
            currentDocument.files.forEach(f => {
                addFileToList(f.name, f.content);
            });
        }
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
            number: documentNumberInput.value,
            supplier: supplierInput.value,
            physical: document.querySelector('input[name="physical"]:checked')?.value,
            chemical: document.querySelector('input[name="chemical"]:checked')?.value,
            material: document.querySelector('input[name="material"]:checked')?.value,
            documentation: document.querySelector('input[name="documentation"]:checked')?.value,
            note: noteInput.value,
            controlBy: controlByInput.value,
            date: dateInput.value,
            result: resultInput.value,
            hasStrana4: true
        };

        if (docIndex !== null) {
            currentDocument = { ...currentDocument, ...inspectionData };
            currentDocument.borderColor = 'green';
            documents[docIndex] = currentDocument;
        }

        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    // Obsluha tlačítka "Konec" – přesměruje zpět na přehled objednávek
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
