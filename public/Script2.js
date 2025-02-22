// Script2.js

document.addEventListener('DOMContentLoaded', function() {
    const cameraButton = document.getElementById('cameraBtn');
    const saveButton = document.getElementById('saveBtn');
    const endButton = document.getElementById('endBtn');
    const fileUpload = document.getElementById('fileUpload');
    const fileList = document.getElementById('fileList');
    const documentForm = document.getElementById('documentForm');
    const form3Container = document.getElementById('form3Container');

    // Pomocná funkce pro získání parametrů z URL
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Získáme ID dokumentu z URL (např. Strana2.html?id=123)
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

    // Načtení dat do formulářových polí
    function loadFormData() {
        if (!currentDocument) return;
        document.getElementById('documentNumber').value = currentDocument.number || '';
        document.getElementById('supplier').value = currentDocument.supplier || '';

        // Nastavení radio tlačítek pro packagingStatus, packageLabel a deliveryMatch
        if (currentDocument.packagingStatus) {
            const packagingInput = document.querySelector(`input[name="packagingStatus"][value="${currentDocument.packagingStatus}"]`);
            if (packagingInput) packagingInput.checked = true;
        }
        if (currentDocument.packageLabel) {
            const labelInput = document.querySelector(`input[name="packageLabel"][value="${currentDocument.packageLabel}"]`);
            if (labelInput) labelInput.checked = true;
        }
        if (currentDocument.deliveryMatch) {
            const deliveryInput = document.querySelector(`input[name="deliveryMatch"][value="${currentDocument.deliveryMatch}"]`);
            if (deliveryInput) deliveryInput.checked = true;
        }
        if (currentDocument.documents && Array.isArray(currentDocument.documents)) {
            currentDocument.documents.forEach(docName => {
                const checkbox = document.querySelector(`input[name="documents"][value="${docName}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';
        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';

        // Zobrazení nahraných souborů
        if (currentDocument.files && Array.isArray(currentDocument.files)) {
            currentDocument.files.forEach(file => {
                addFileToList(file.name, file.content);
            });
        }

        // Načtení dodatečného formuláře (Form3)
        loadForm3();
    }

    // Vykreslení dodatečného formuláře (Form3)
    function loadForm3() {
        form3Container.innerHTML = `
            <div class="form-group">
                <label for="orderNumber">Číslo objednávky</label>
                <input type="text" id="orderNumber" name="orderNumber" value="${currentDocument.orderNumber || ''}">
            </div>
            <div class="form-group">
                <label for="supplier">Dodavatel</label>
                <input type="text" id="supplierForm3" name="supplier" value="${currentDocument.supplier || ''}">
            </div>
            <div class="form-group">
                <label for="confirmedDeliveryDate">Potvrzené datum dodání</label>
                <input type="date" id="confirmedDeliveryDate" name="confirmedDeliveryDate" value="${currentDocument.confirmedDeliveryDate || ''}">
            </div>
            <div class="form-group">
                <label for="deliveryDate">Datum dodání</label>
                <input type="date" id="deliveryDate" name="deliveryDate" value="${currentDocument.deliveryDate || ''}">
            </div>
            <div class="form-group">
                <label for="timeliness">Včasnost dodávky</label>
                <div>
                    <label><input type="radio" name="timeliness" value="OK" ${currentDocument.timeliness === 'OK' ? 'checked' : ''}> OK</label>
                    <label><input type="radio" name="timeliness" value="NOK" ${currentDocument.timeliness === 'NOK' ? 'checked' : ''}> NOK</label>
                </div>
            </div>
            <div class="form-group">
                <label>Kontrola vůči systému (úplnost, cena...)</label>
                <div>
                    <label><input type="radio" name="systemCheck" value="1" ${currentDocument.systemCheck === '1' ? 'checked' : ''}> 1</label>
                    <label><input type="radio" name="systemCheck" value="2" ${currentDocument.systemCheck === '2' ? 'checked' : ''}> 2</label>
                </div>
            </div>
            <div class="form-group">
                <label>Komunikace s dodavatelem</label>
                <div>
                    <label><input type="radio" name="communication" value="1" ${currentDocument.communication === '1' ? 'checked' : ''}> 1</label>
                    <label><input type="radio" name="communication" value="2" ${currentDocument.communication === '2' ? 'checked' : ''}> 2</label>
                </div>
            </div>
            <div class="form-group">
                <label>Druh zboží</label>
                <div>
                    <label><input type="checkbox" name="goodsType" value="Výrobní" ${(currentDocument.goodsType && currentDocument.goodsType.includes('Výrobní')) ? 'checked' : ''}> Výrobní</label>
                    <label><input type="checkbox" name="goodsType" value="Ostatní" ${(currentDocument.goodsType && currentDocument.goodsType.includes('Ostatní')) ? 'checked' : ''}> Ostatní</label>
                </div>
            </div>
        `;
    }

    // Funkce pro přidání souboru do seznamu zobrazeného uživateli
    function addFileToList(fileName, fileContent) {
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.target = '_blank';
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Obsluha nahrávání souborů – při výběru souboru se přečte jeho obsah a aktualizuje se currentDocument.files
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;

        files.forEach(function(file) {
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

    // Uložení formuláře – shromáždění dat z formuláře a odeslání PUT requestem na server (endpoint: PUT /api/documents/:id)
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        const updatedData = {
            number: document.getElementById('documentNumber').value,
            supplier: document.getElementById('supplier').value,
            packagingStatus: document.querySelector('input[name="packagingStatus"]:checked') ? document.querySelector('input[name="packagingStatus"]:checked').value : '',
            packageLabel: document.querySelector('input[name="packageLabel"]:checked') ? document.querySelector('input[name="packageLabel"]:checked').value : '',
            deliveryMatch: document.querySelector('input[name="deliveryMatch"]:checked') ? document.querySelector('input[name="deliveryMatch"]:checked').value : '',
            documents: Array.from(document.querySelectorAll('input[name="documents"]:checked')).map(el => el.value),
            note: document.getElementById('note').value,
            controlBy: document.getElementById('controlBy').value,
            date: document.getElementById('date').value,
            result: document.getElementById('result').value,
            files: currentDocument.files || {}
        };

        // Data z dodatečného formuláře (Form3)
        updatedData.orderNumber = document.getElementById('orderNumber').value;
        updatedData.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        updatedData.deliveryDate = document.getElementById('deliveryDate').value;
        updatedData.timeliness = document.querySelector('input[name="timeliness"]:checked') ? document.querySelector('input[name="timeliness"]:checked').value : '';
        updatedData.systemCheck = document.querySelector('input[name="systemCheck"]:checked') ? document.querySelector('input[name="systemCheck"]:checked').value : '';
        updatedData.communication = document.querySelector('input[name="communication"]:checked') ? document.querySelector('input[name="communication"]:checked').value : '';
        updatedData.goodsType = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);

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

    // Tlačítko "Konec" – přesměruje bez uložení na Strana1.html
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });

    // Načteme dokument při spuštění skriptu
    loadDocument();
});
