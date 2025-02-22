// Script5.js

document.addEventListener('DOMContentLoaded', function () {
    const confirmButton = document.getElementById('confirmBtn');
    const endButton = document.getElementById('endBtn');
    const recipientNameInput = document.getElementById('recipientName');
    const orderNumberInput = document.getElementById('orderNumber');

    // Vytvoření divu pro zobrazení souhrnu formulářů
    const displayFormsDiv = document.createElement('div');
    document.body.appendChild(displayFormsDiv);

    // Pomocná funkce pro získání parametrů z URL
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const docId = getQueryParam('id');
    if (!docId) {
        alert('Není zadáno ID dokumentu.');
        window.location.href = 'Strana1.html';
        return;
    }

    let currentDocument = {};

    // Načtení dokumentu ze serveru pomocí GET /api/documents/:id
    function loadDocument() {
        fetch(`/api/documents/${docId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Chyba při načítání dokumentu.');
                }
                return response.json();
            })
            .then(doc => {
                currentDocument = doc;
                displayFilledForms();
            })
            .catch(error => {
                console.error(error);
                alert('Chyba při načítání dokumentu.');
            });
    }

    // Zobrazení souhrnu formulářů
    function displayFilledForms() {
        if (!currentDocument) return;

        // Automatické vyplnění čísla dokumentu do pole "Číslo objednávky"
        if (currentDocument.number) {
            orderNumberInput.value = currentDocument.number;
        }

        let formData = `
Formulář ze Strany 2
Číslo dokumentu: ${currentDocument.number || ''}
Dodavatel: ${currentDocument.supplier || ''}
Stav balení: ${currentDocument.packagingStatus || ''}
Označení balení: ${currentDocument.packageLabel || ''}
Dodávka odpovídá dokumentům: ${currentDocument.deliveryMatch || ''}
Dokumenty dodávky: ${(currentDocument.documents || []).join(', ')}
Poznámka: ${currentDocument.note || ''}
Kontroloval: ${currentDocument.controlBy || ''}
Datum: ${currentDocument.date || ''}
Výsledek: ${currentDocument.result || ''}
`;
        formData += `
Formulář ze Strany 3
Číslo objednávky: ${currentDocument.orderNumber || ''}
Potvrzené datum dodání: ${currentDocument.confirmedDeliveryDate || ''}
Datum dodání: ${currentDocument.deliveryDate || ''}
Cena: ${currentDocument.price || ''}
Včasnost dodávky: ${currentDocument.timeliness || ''}
Kontrola vůči systému: ${currentDocument.systemCheck || ''}
Komunikace s dodavatelem: ${currentDocument.communication || ''}
Druh zboží: ${(currentDocument.goodsType || []).join(', ')}
Poznámka: ${currentDocument.note || ''}
Vstupní kontrola: ${currentDocument.entryControl || ''}
`;
        if (currentDocument.hasStrana4) {
            formData += `
Formulář ze Strany 4
Fyzická kontrola: ${currentDocument.physical || ''}
Chemická kontrola: ${currentDocument.chemical || ''}
Materiálová kontrola: ${currentDocument.material || ''}
Dokumentace: ${currentDocument.documentation || ''}
Poznámka: ${currentDocument.note || ''}
Kontroloval: ${currentDocument.controlBy || ''}
Datum: ${currentDocument.date || ''}
Výsledek: ${currentDocument.result || ''}
`;
        }
        // Přidání jména příjemce do souhrnu
        formData += `
Jméno příjemce: ${recipientNameInput.value || 'Neuvedeno'}
`;
        displayFormsDiv.innerText = formData.trim();
    }

    // Aktualizace zobrazení při změně jména příjemce
    recipientNameInput.addEventListener('input', function () {
        displayFilledForms();
    });

    // Obsluha tlačítka "Potvrdit" pro generování ZIP souboru
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

        // Vytvoření souhrnného textu z vyplněných formulářů
        const filledData = displayFormsDiv.innerText;

        // Připravíme přílohy – předpokládáme, že currentDocument.files obsahuje objekty se jménem a datovým URL
        const attachments = (currentDocument.files || []).map(file => ({
            filename: file.name,
            // Odstraníme hlavičku data URL (např. "data:image/png;base64,") a ponecháme jen samotná data
            content: file.content.split(',')[1]
        }));

        const payload = {
            filledData,
            attachments,
            orderNumber
        };

        // Volání API endpointu /generateZip pro vygenerování ZIP souboru
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
            // Vytvoříme odkaz ke stažení vygenerovaného ZIP souboru
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${orderNumber}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            // Po stažení přesměrujeme zpět na Stranu1.html
            window.location.href = 'Strana1.html';
        })
        .catch(error => {
            console.error(error);
            alert('Chyba při generování ZIP souboru.');
        });
    });

    // Tlačítko "Konec" – bez uložení přesměruje zpět na Strana1.html
    endButton.addEventListener('click', function () {
        window.location.href = 'Strana1.html';
    });

    loadDocument();
});
