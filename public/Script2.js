document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    var fileUpload = document.getElementById('fileUpload');
    var fileList = document.getElementById('fileList');
    var documentNumberInput = document.getElementById('documentNumber');

    let documents = [];
    let currentDocumentIndex = null;

    // 📌 Načtení objednávek ze serveru
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

    // 📌 Uložení objednávek na server
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

    // 📌 Načtení dat formuláře
    function loadFormData() {
        if (currentDocumentIndex === null || !documents[currentDocumentIndex]) return;
        let currentDocument = documents[currentDocumentIndex];

        documentNumberInput.value = currentDocument.number || ''; 
        document.getElementById('supplier').value = currentDocument.supplier || ''; 

        function setChecked(name, value) {
            var input = document.querySelector(`input[name="${name}"][value="${value || ''}"]`);
            if (input) {
                input.checked = true;
            }
        }

        setChecked("packagingStatus", currentDocument.packagingStatus);
        setChecked("packageLabel", currentDocument.packageLabel);
        setChecked("deliveryMatch", currentDocument.deliveryMatch);

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
        var documentNumber = documentNumberInput.value;

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

        var documentData = {
            number: documentNumberInput.value, 
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
        documents[currentDocumentIndex].borderColor = 'blue'; 

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
