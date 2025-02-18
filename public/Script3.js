document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var fileUpload = document.getElementById('fileUpload');
    var fileList = document.getElementById('fileList');
    var form2Container = document.getElementById('form2Container');

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

        var form2HTML = `
            <div class="form-group">
                <h2>Číslo dokumentu</h2>
                <input type="text" id="documentNumber" name="documentNumber" value="${currentDocument.number || ''}" readonly>
            </div>
        `;
        form2Container.innerHTML = form2HTML;

        document.getElementById('orderNumber').value = currentDocument.orderNumber || '';
        document.getElementById('supplier').value = currentDocument.supplier || ''; 
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value = currentDocument.deliveryDate || '';
        document.getElementById('price').value = currentDocument.price || '';

        if (currentDocument.timeliness) {
            document.querySelector(`input[name="timeliness"][value="${currentDocument.timeliness}"]`).checked = true;
        }
        if (currentDocument.systemCheck) {
            document.querySelector(`input[name="systemCheck"][value="${currentDocument.systemCheck}"]`).checked = true;
        }
        if (currentDocument.communication) {
            document.querySelector(`input[name="communication"][value="${currentDocument.communication}"]`).checked = true;
        }
        if (currentDocument.goodsType) {
            currentDocument.goodsType.forEach(function(type) {
                document.querySelector(`input[name="goodsType"][value="${type}"]`).checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';

        if (currentDocument.entryControl) {
            document.querySelector(`input[name="entryControl"][value="${currentDocument.entryControl}"]`).checked = true;
        }

        // Načtení nahraných souborů
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }
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
        var documentNumber = document.getElementById('documentNumber').value;

        files.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var fileContent = e.target.result;

                var fileName = documentNumber ? `${documentNumber}_${file.name}` : file.name;

                addFileToList(fileName, fileContent);
                if (!currentDocument.files) {
                    currentDocument.files = [];
                }
                currentDocument.files.push({ name: fileName, content: fileContent });

                saveOrders(); // 📌 Uložit soubory na server
            };
            reader.readAsDataURL(file); 
        });
    });

    saveButton.addEventListener('click', function(event) {
        event.preventDefault();

        if (currentDocumentIndex === null) return;
        let currentDocument = documents[currentDocumentIndex];

        var entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;

        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }

        var orderData = {
            entryControl: entryControlValue,
            orderNumber: document.getElementById('orderNumber').value,
            supplier: document.getElementById('supplier').value,
            confirmedDeliveryDate: document.getElementById('confirmedDeliveryDate').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            price: document.getElementById('price').value,
            timeliness: document.querySelector('input[name="timeliness"]:checked')?.value,
            systemCheck: document.querySelector('input[name="systemCheck"]:checked')?.value,
            communication: document.querySelector('input[name="communication"]:checked')?.value,
            goodsType: Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value),
            note: document.getElementById('note').value,
            number: document.getElementById('documentNumber').value,
            files: currentDocument.files || []
        };

        documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...orderData };

        if (entryControlValue === 'Ano') {
            documents[currentDocumentIndex].borderColor = 'orange';
            documents[currentDocumentIndex].hasStrana4 = true;
        } else if (entryControlValue === 'Ne') {
            documents[currentDocumentIndex].borderColor = 'green';
        }

        saveOrders(); // 📌 Uložit na server
        localStorage.removeItem('currentDocumentIndex');

        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        localStorage.removeItem('currentDocumentIndex');
        window.location.href = 'Strana1.html';
    });

    loadOrders(); // 📌 Načtení objednávek při načtení stránky
});
