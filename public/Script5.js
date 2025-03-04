document.addEventListener('DOMContentLoaded', function () {
    // Inicializace socket.io – pokud onlineserv.js již vytvořil socket, použijeme window.socket, jinak vytvoříme nový
    const socket = window.socket || io();
    
    // Získání parametru docIndex z URL
    const urlParams = new URLSearchParams(window.location.search);
    const docIndex = urlParams.get('docIndex');
    
    // Globální proměnné pro dokumenty a aktuální dokument
    let documents = [];
    let currentDocument = {};

    // Získání prvků formuláře
    const confirmButton = document.getElementById('confirmBtn');
    const endButton = document.getElementById('endBtn');
    const recipientNameInput = document.getElementById('recipientName');
    const orderNumberInput = document.getElementById('orderNumber');
    
    // Vytvoření divu pro zobrazení souhrnu formulářů
    const displayFormsDiv = document.createElement('div');

    // Funkce pro zobrazení vyplněných formulářů
    function displayFilledForms() {
        let formData = '';
        if (currentDocument) {
            // Formulář ze Strany 2
            formData += `Formulář ze Strany 2\n`;
            formData += `Číslo dokumentu: ${currentDocument.number || ''}\n`;
            formData += `Dodavatel: ${currentDocument.supplier || ''}\n`;
            formData += `Stav balení: ${currentDocument.packagingStatus || ''}\n`;
            formData += `Označení balení: ${currentDocument.packageLabel || ''}\n`;
            formData += `Dodávka odpovídá dokumentům: ${currentDocument.deliveryMatch || ''}\n`;
            formData += `Dokumenty dodávky: ${(currentDocument.documents || []).join(', ')}\n`;
            formData += `Poznámka: ${currentDocument.note || ''}\n`;
            formData += `Kontroloval: ${currentDocument.controlBy || ''}\n`;
            formData += `Datum: ${currentDocument.date || ''}\n`;
            formData += `Výsledek: ${currentDocument.result || ''}\n\n`;
            
            // Formulář ze Strany 3
            formData += `Formulář ze Strany 3\n`;
            formData += `Číslo objednávky: ${currentDocument.orderNumber || ''}\n`;
            formData += `Potvrzené datum dodání: ${currentDocument.confirmedDeliveryDate || ''}\n`;
            formData += `Datum dodání: ${currentDocument.deliveryDate || ''}\n`;
            formData += `Cena: ${currentDocument.price || ''}\n`;
            formData += `Včasnost dodávky: ${currentDocument.timeliness || ''}\n`;
            formData += `Kontrola vůči systému: ${currentDocument.systemCheck || ''}\n`;
            formData += `Komunikace s dodavatelem: ${currentDocument.communication || ''}\n`;
            formData += `Druh zboží: ${(currentDocument.goodsType || []).join(', ')}\n`;
            formData += `Poznámka: ${currentDocument.note || ''}\n`;
            formData += `Vstupní kontrola: ${currentDocument.entryControl || ''}\n\n`;
            
            // Formulář ze Strany 4 (pokud existuje)
            if (currentDocument.hasStrana4) {
                formData += `Formulář ze Strany 4\n`;
                formData += `Fyzická kontrola: ${currentDocument.physical || ''}\n`;
                formData += `Chemická kontrola: ${currentDocument.chemical || ''}\n`;
                formData += `Materiálová kontrola: ${currentDocument.material || ''}\n`;
                formData += `Dokumentace: ${currentDocument.documentation || ''}\n`;
                formData += `Poznámka: ${currentDocument.note || ''}\n`;
                formData += `Kontroloval: ${currentDocument.controlBy || ''}\n`;
                formData += `Datum: ${currentDocument.date || ''}\n`;
                formData += `Výsledek: ${currentDocument.result || ''}\n\n`;
            }
            
            // Přidání jména příjemce – z formuláře Strany 5
            formData += `Jméno příjemce: ${recipientNameInput.value || 'Neuvedeno'}\n`;
        }
        displayFormsDiv.innerText = formData;
    }
    
    // Přidáme displayFormsDiv do dokumentu (můžeš jej umístit kamkoliv, např. na konec body)
    document.body.appendChild(displayFormsDiv);
    displayFilledForms();
    
    // Aktualizace zobrazení při změně jména příjemce
    recipientNameInput.addEventListener('input', function () {
        displayFilledForms();
    });
    
    // Při obdržení synchronizovaných dokumentů aktualizujeme currentDocument
    document.addEventListener('documentsUpdated', function (event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
            if (currentDocument.number) {
                orderNumberInput.value = currentDocument.number;
            }
            displayFilledForms();
        }
    });
    
    // Po navázání spojení požádáme server o aktuální dokumenty
    socket.emit('requestDocuments');
    
    // Obsluha tlačítka "Potvrdit" – před generováním ZIP souboru:
    // Uložíme do aktuálního dokumentu hodnotu z pole "Jméno příjemce", nastavíme barvu dokumentu na šedou a poté vygenerujeme ZIP
    confirmButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (!currentDocument) {
            alert('Chyba: Žádná data k exportu.');
            return;
        }
        const orderNumber = orderNumberInput.value.trim();
        if (!orderNumber) {
            alert('Chyba: Číslo objednávky není vyplněno.');
            return;
        }
    
        // Uložíme jméno příjemce z pole do aktuálního dokumentu
        currentDocument.recipientName = recipientNameInput.value || 'Neuvedeno';
    
        // Připravíme text se souhrnem vyplněných formulářů
        const filledData = displayFormsDiv.innerText;
    
        // Připravíme přílohy – pokud existují nahrané soubory
        const attachments = currentDocument.files ? currentDocument.files.map(file => {
            return {
                filename: file.name,
                content: file.content.split(',')[1] // odstraníme prefix dataURL
            };
        }) : [];
    
        const payload = {
            filledData: filledData,
            attachments: attachments,
            orderNumber: orderNumber
        };
    
        // Odeslání POST požadavku na /generateZip pro vygenerování ZIP souboru
        fetch('/generateZip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Chyba při generování ZIP souboru.');
            }
            return response.blob();
        })
        .then(blob => {
            // Vytvoříme dočasný odkaz pro stažení ZIP souboru
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = orderNumber + '.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            // Nastavíme barvu aktuálního dokumentu na šedou
            if (currentDocument) {
                currentDocument.borderColor = 'gray';
                if (docIndex !== null) {
                    documents[docIndex] = currentDocument;
                }
                socket.emit('updateDocuments', documents);
            }
            // Přesměrujeme uživatele zpět na Stranu1
            window.location.href = 'Strana1.html';
        })
        .catch(error => {
            console.error(error);
            alert('Chyba při generování ZIP souboru: ' + error.message);
        });
    });
    
    // Obsluha tlačítka "Konec" – přesměruje zpět na Stranu1
    endButton.addEventListener('click', function () {
        window.location.href = 'Strana1.html';
    });
});
