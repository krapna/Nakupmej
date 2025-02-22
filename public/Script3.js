// Script3.js

document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('saveBtn');
    const endButton = document.getElementById('endBtn');
    const fileUpload = document.getElementById('fileUpload');
    const fileList = document.getElementById('fileList');
    const form2Container = document.getElementById('form2Container');

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
                    throw new Error('Chyba při načítání dokumentu ze serveru.');
                }
                return response.json();
            })
            .then(doc => {
                currentDocument = doc;
                loadFormData();
            })
            .catch(error => {
                console.error(error);
                alert('Chyba při načítání dokumentu.');
            });
    }

    // Načtení dat do formuláře
    function loadFormData() {
        if (!currentDocument) return;

        // Vyplnění kontejneru pro zobrazení čísla dokumentu
        form2Container.innerHTML = `
            <div class="form-group">
                <h2>Číslo dokumentu</h2>
                <input type="text" id="documentNumber" name="documentNumber" value="${currentDocument.number || ''}" readonly>
            </div>
        `;

        // Předvyplnění ostatních polí formuláře
        document.getElementById('orderNumber').value = currentDocument.orderNumber || '';
        document.getElementById('supplier').value = currentDocument.supplier || '';
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value = currentDocument.deliveryDate || '';
        document.getElementById('price').value = currentDocument.price || '';
        document.getElementById('note').value = currentDocument.note || '';

        // Nastavení radiobuttonu pro včasnost dodávky
        if (currentDocument.timeliness) {
            const timelinessInput = document.querySelector(`input[name="timeliness"][value="${currentDocument.timeliness}"]`);
            if (timelinessInput) timelinessInput.checked = true;
        }
        // Nastavení radiobuttonu pro kontrolu vůči systému
        if (currentDocument.systemCheck) {
            const systemCheckInput = document.querySelector(`input[name="systemCheck"][value="${currentDocument.systemCheck}"]`);
            if (systemCheckInput) systemCheckInput.checked = true;
        }
        // Nastavení radiobuttonu pro komunikaci s dodavatelem
        if (currentDocument.communication) {
            const communicationInput = document.querySelector(`input[name="communication"][value="${currentDocument.communication}"]`);
            if (communicationInput) communicationInput.checked = true;
        }
        // Nastavení checkboxů pro druh zboží
        if (currentDocument.goodsType && Array.isArray(currentDocument.goodsType)) {
            currentDocument.goodsType.forEach(type => {
                const checkbox = document.querySelector(`input[name="goodsType"][value="${type}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        // Nastavení radiobuttonu pro vstupní kontrolu
        if (currentDocument.entryControl) {
            const entryControlInput = document.querySelector(`input[name="entryControl"][value="${currentDocument.entryControl}"]`);
            if (entryControlInput) entryControlInput.checked = true;
        }

        // Zobrazení nahraných souborů
        if (currentDocument.files && Array.isArray(currentDocument.files)) {
            currentDocument.files.forEach(file => {
                addFileToList(file.name, file.content);
            });
        }
    }

    // Přidání souboru do seznamu zobrazeného uživateli
    function addFileToList(fileName, fileContent) {
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.target = '_blank';
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Obsluha nahrávání souborů
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileContent = e.target.result;
                const fileName = documentNumber ? `${documentNumber}_${file.name}` : file.name;
                addFileToList(fileName, fileContent);
                if (!currentDocument.files) {
                    currentDocument.files = [];
                }
                currentDocument.files.push({ name: fileName, content: fileContent });
            };
            reader.readAsDataURL(file);
        });
    });

    // Uložení formuláře – shromáždění dat a odeslání PUT requestem na server
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        const entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }

        const updatedData = {
            orderNumber: document.getElementById('orderNumber').value,
            supplier: document.getElementById('supplier').value,
            confirmedDeliveryDate: document.getElementById('confirmedDeliveryDate').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            price: document.getElementById('price').value,
            timeliness: document.querySelector('input[name="timeliness"]:checked') ? document.querySelector('input[name="timeliness"]:checked').value : '',
            systemCheck: document.querySelector('input[name="systemCheck"]:checked') ? document.querySelector('input[name="systemCheck"]:checked').value : '',
            communication: document.querySelector('input[name="communication"]:checked') ? document.querySelector('input[name="communication"]:checked').value : '',
            goodsType: Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value),
            note: document.getElementById('note').value,
            entryControl: entryControlValue,
            files: currentDocument.files || []
        };

        fetch(`/api/documents/${docId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Chyba při ukládání dokumentu.');
            }
            return response.json();
        })
        .then(data => {
            window.location.href = 'Strana1.html';
        })
        .catch(error => {
            console.error(error);
            alert('Chyba při ukládání dokumentu.');
        });
    });

    // Tlačítko "Konec" – přesměruje zpět na Strana1.html bez uložení změn
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });

    loadDocument();
});
