document.addEventListener('DOMContentLoaded', function () {
    var confirmButton = document.getElementById('confirmBtn');
    var endButton = document.getElementById('endBtn');
    var recipientNameInput = document.getElementById('recipientName');
    var orderNumberInput = document.getElementById('orderNumber');
    var displayFormsDiv = document.createElement('div'); // Div pro zobrazení formulářů

    let documents = [];
    let currentDocumentIndex = null;

    // 📌 Funkce pro načtení objednávek ze serveru
    function loadOrders() {
        fetch('https://nakupmej.onrender.com/getOrders')
            .then(response => response.json())
            .then(data => {
                documents = data;
                currentDocumentIndex = localStorage.getItem('currentDocumentIndex');
                displayFilledForms();
            })
            .catch(error => console.error('Chyba při načítání objednávek:', error));
    }

    function displayFilledForms() {
        displayFormsDiv.innerHTML = '';

        if (currentDocumentIndex === null || !documents[currentDocumentIndex]) return;
        let currentDocument = documents[currentDocumentIndex];

        // **Automatické vyplnění čísla dokumentu do pole Číslo objednávky**
        if (currentDocument.number) {
            orderNumberInput.value = currentDocument.number;
        }

        var formData = `
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

        // **Formulář ze Strany 3**
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

        // **Formulář ze Strany 4**
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

        // **Přidání jména příjemce do formulářových údajů**
        formData += `
            Jméno příjemce: ${recipientNameInput.value || 'Neuvedeno'}
        `;

        displayFormsDiv.innerText = formData.trim();
    }

    displayFilledForms();
    document.body.appendChild(displayFormsDiv);

    recipientNameInput.addEventListener('input', function () {
        displayFilledForms(); // Aktualizace údajů při zadání jména
    });

    confirmButton.addEventListener('click', function (event) {
        event.preventDefault();

        if (currentDocumentIndex === null || !documents[currentDocumentIndex]) {
            alert('Chyba: Žádná data k exportu.');
            return;
        }

        var orderNumber = orderNumberInput.value.trim();
        if (!orderNumber) {
            alert('Chyba: Číslo objednávky není vyplněno.');
            return;
        }

        let currentDocument = documents[currentDocumentIndex];

        var attachments = currentDocument.files ? currentDocument.files.map(file => ({
            filename: file.name,
            content: file.content.split("base64,")[1]
        })) : [];

        fetch('https://nakupmej.onrender.com/generateZip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filledData: displayFormsDiv.innerText, attachments, orderNumber })
        })
        .then(response => response.blob())
        .then(blob => {
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = orderNumber + '.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            alert('ZIP soubor byl úspěšně stažen jako ' + orderNumber + '.zip');
        })
        .catch(error => {
            console.error('Chyba při generování ZIP souboru:', error);
            alert('Došlo k chybě při generování ZIP souboru.');
        });
    });

    endButton.addEventListener('click', function () {
        window.location.href = 'Strana1.html';
    });

    loadOrders(); // 📌 Načtení objednávek při načtení stránky
});
