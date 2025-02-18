document.addEventListener('DOMContentLoaded', function() {
    var cameraButton = document.getElementById('cameraBtn');
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var fileUpload = document.getElementById('fileUpload');
    var fileList = document.getElementById('fileList');
    var documentForm = document.getElementById('documentForm');
    var form3Container = document.getElementById('form3Container');

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

        document.getElementById('documentNumber').value = currentDocument.number || '';
        document.getElementById('supplier').value = currentDocument.supplier || ''; 
        
        if (currentDocument.packagingStatus) {
            document.querySelector(`input[name="packagingStatus"][value="${currentDocument.packagingStatus}"]`).checked = true;
        }
        if (currentDocument.packageLabel) {
            document.querySelector(`input[name="packageLabel"][value="${currentDocument.packageLabel}"]`).checked = true;
        }
        if (currentDocument.deliveryMatch) {
            document.querySelector(`input[name="deliveryMatch"][value="${currentDocument.deliveryMatch}"]`).checked = true;
        }
        if (currentDocument.documents) {
            currentDocument.documents.forEach(function(doc) {
                document.querySelector(`input[name="documents"][value="${doc}"]`).checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';
        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';

        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }

        loadForm3(currentDocument);
    }

    function loadForm3(currentDocument) {
        var form3HTML = `
            <div class="form-group">
                <label for="orderNumber">Číslo objednávky</label>
                <input type="text" id="orderNumber" name="orderNumber" value="${currentDocument.orderNumber || ''}">
            </div>
            <div class="form-group">
                <label for="supplier">Dodavatel</label>
                <input type="text" id="supplier" name="supplier" value="${currentDocument.supplier || ''}">
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
        `;

        form3Container.innerHTML = form3HTML;
    }

    function addFileToList(fileName, fileContent) {
        var fileItem = document.createElement('div');
        var link = document.createElement('a');
        link.href = fileContent;
        link.target = '_blank';
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    fileUpload.addEventListener('change', function(event) {
        if (currentDocumentIndex === null) return;
        let currentDocument = documents[currentDocumentIndex];

        var files = Array.from(event.target.files);
        files.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var fileContent = e.target.result;
                addFileToList(file.name, fileContent);
                if (!currentDocument.files) {
                    currentDocument.files = [];
                }
                currentDocument.files.push({ name: file.name, content: fileContent });
                saveOrders(); // 📌 Uložit soubory na server
            };
            reader.readAsDataURL(file); 
        });
    });

    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        if (currentDocumentIndex === null) return;
        let currentDocument = documents[currentDocumentIndex];

        var documentData = {
            number: document.getElementById('documentNumber').value,
            supplier: document.getElementById('supplier').value,
            packagingStatus: document.querySelector('input[name="packagingStatus"]:checked')?.value,
            packageLabel: document.querySelector('input[name="packageLabel"]:checked')?.value,
            deliveryMatch: document.querySelector('input[name="deliveryMatch"]:checked')?.value,
            documents: Array.from(document.querySelectorAll('input[name="documents"]:checked')).map(el => el.value),
            note: document.getElementById('note').value,
            controlBy: document.getElementById('controlBy').value,
            date: document.getElementById('date').value,
            result: document.getElementById('result').value,
            files: currentDocument.files || []
        };

        documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...documentData };

        saveOrders(); // 📌 Uložit na server
        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        localStorage.removeItem('currentDocumentIndex');
        window.location.href = 'Strana1.html';
    });

    loadOrders(); // 📌 Načtení objednávek při načtení stránky
});
