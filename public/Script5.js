// Script5.js – upraveno pro podporu pěti polí „Jméno příjemce“ a jejich zahrnutí do generovaného obsahu
document.addEventListener('DOMContentLoaded', function () {
    const socket = window.socket || io();
    const urlParams = new URLSearchParams(window.location.search);
    const docIndex = urlParams.get('docIndex');
    let documents = [];
    let currentDocument = {};

    // Získání prvků formuláře
    const confirmButton        = document.getElementById('confirmBtn');
    const endButton            = document.getElementById('endBtn');
    const recipientNameInput1  = document.getElementById('recipientName1');
    const recipientNameInput2  = document.getElementById('recipientName2');
    const recipientNameInput3  = document.getElementById('recipientName3');
    const recipientNameInput4  = document.getElementById('recipientName4');
    const recipientNameInput5  = document.getElementById('recipientName5');
    const orderNumberInput     = document.getElementById('orderNumber');

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
            formData += `Umístění: ${(currentDocument.location || []).join(', ')}\n`;
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

            // Pět polí Jméno příjemce
            formData += `Jméno příjemce 1: ${recipientNameInput1.value || 'Neuvedeno'}\n`;
            formData += `Jméno příjemce 2: ${recipientNameInput2.value || 'Neuvedeno'}\n`;
            formData += `Jméno příjemce 3: ${recipientNameInput3.value || 'Neuvedeno'}\n`;
            formData += `Jméno příjemce 4: ${recipientNameInput4.value || 'Neuvedeno'}\n`;
            formData += `Jméno příjemce 5: ${recipientNameInput5.value || 'Neuvedeno'}\n\n`;

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
        }
        displayFormsDiv.innerText = formData;
    }

    // Přidáme displayFormsDiv do dokumentu
    document.body.appendChild(displayFormsDiv);
    displayFilledForms();

    // Aktualizace zobrazení při změně některého jména příjemce
    [recipientNameInput1, recipientNameInput2, recipientNameInput3, recipientNameInput4, recipientNameInput5]
        .forEach(input => {
            input.addEventListener('input', displayFilledForms);
        });

    // Při obdržení synchronizovaných dokumentů aktualizujeme currentDocument a předvyplníme pole
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
            if (currentDocument.number) {
                orderNumberInput.value = currentDocument.number;
            }
            // Předvyplnění pěti polí Jméno příjemce, pokud existují
            if (currentDocument.recipientName1) recipientNameInput1.value = currentDocument.recipientName1;
            if (currentDocument.recipientName2) recipientNameInput2.value = currentDocument.recipientName2;
            if (currentDocument.recipientName3) recipientNameInput3.value = currentDocument.recipientName3;
            if (currentDocument.recipientName4) recipientNameInput4.value = currentDocument.recipientName4;
            if (currentDocument.recipientName5) recipientNameInput5.value = currentDocument.recipientName5;
            displayFilledForms();
        }
    });
    socket.emit('requestDocuments');

    // Obsluha tlačítka "Potvrdit" – generování ZIP a uložení pěti polí Jméno příjemce
    confirmButton.addEventListener('click', function(event) {
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

        // Uložení pěti polí Jméno příjemce do aktuálního dokumentu
        currentDocument.recipientName1 = recipientNameInput1.value || 'Neuvedeno';
        currentDocument.recipientName2 = recipientNameInput2.value || 'Neuvedeno';
        currentDocument.recipientName3 = recipientNameInput3.value || 'Neuvedeno';
        currentDocument.recipientName4 = recipientNameInput4.value || 'Neuvedeno';
        currentDocument.recipientName5 = recipientNameInput5.value || 'Neuvedeno';

        // Generování textu pro PDF z displayFormsDiv
        const filledData = displayFormsDiv.innerText;

        const payload = {
            filledData: filledData,
            attachments: [],
            orderNumber: orderNumber
        };

        fetch('/generateZip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Chyba při generování ZIP souboru.');
            }
            return response.blob();
        })
        .then(blob => {
            // Stažení ZIP souboru
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = orderNumber + '.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            // Nastavíme barvu na šedou a odešleme aktualizaci
            if (currentDocument) {
                currentDocument.borderColor = 'gray';
                if (docIndex !== null) {
                    documents[docIndex] = currentDocument;
                }
                socket.emit('updateDocuments', documents);
            }
            window.location.href = 'Strana1.html';
        })
        .catch(error => {
            console.error(error);
            alert('Chyba při generování ZIP souboru: ' + error.message);
        });
    });

    // Obsluha tlačítka "Konec" – návrat na Strana1, ale zachování pěti polí Jméno příjemce
    endButton.addEventListener('click', function() {
        // Uložení pěti polí Jméno příjemce
        currentDocument.recipientName1 = recipientNameInput1.value;
        currentDocument.recipientName2 = recipientNameInput2.value;
        currentDocument.recipientName3 = recipientNameInput3.value;
        currentDocument.recipientName4 = recipientNameInput4.value;
        currentDocument.recipientName5 = recipientNameInput5.value;
        // Označení dokumentu jako draft
        currentDocument.draftStrana3 = true;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
            socket.emit('updateDocuments', documents);
        }
        window.location.href = 'Strana1.html';
    });
});
