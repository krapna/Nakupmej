const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Cesta k souboru, kam budeme ukládat data
const dataFilePath = path.join(__dirname, 'data.json');

// Pomocné funkce pro čtení a zápis dat do souboru
function readOrdersFromFile() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading orders from file:', err);
    return [];
  }
}

function writeOrdersToFile(orders) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('Error writing orders to file:', err);
  }
}

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// Statické soubory
app.use(express.static(path.join(__dirname, 'public')));

// Hlavní stránka
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Strana0.html'));
});

// Endpoint pro synchronizaci – klient posílá (nebo nemusí posílat) své lokální data,
// ale my vždy vrátíme obsah souboru jako zdroj pravdy.
app.post('/syncOrders', (req, res) => {
  // Pro jednoduchost ignorujeme data, která klient posílá a vrátíme obsah souboru.
  const orders = readOrdersFromFile();
  res.json({ mergedOrders: orders });
});

// Endpoint pro odstranění objednávky podle čísla
app.post('/deleteOrder', (req, res) => {
  const orderNumber = req.body.number;
  let orders = readOrdersFromFile();
  const newOrders = orders.filter(order => order.number !== orderNumber);
  writeOrdersToFile(newOrders);
  res.json({ success: true });
});

// Endpoint pro generování ZIP souboru – beze změn
app.post('/generateZip', async (req, res) => {
  const { filledData, attachments, orderNumber } = req.body;
  try {
    if (!filledData || filledData.trim() === "") {
      throw new Error("filledData je prázdné, PDF se nevygeneruje.");
    }

    const tempFolder = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder);
    }

    const fileName = orderNumber ? orderNumber : 'Dokument';
    const pdfPath = path.join(tempFolder, `${fileName}.pdf`);
    const pdfDoc = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(pdfStream);

    pdfDoc.font('Helvetica').fontSize(14).text(`Souhrn vyplněných formulářů`, { align: 'center' });
    pdfDoc.moveDown(2);

    filledData.split('\n').forEach(line => {
      pdfDoc.fontSize(12).text(line.trim(), { align: 'left' });
      pdfDoc.moveDown(0.5);
    });

    pdfDoc.end();

    await new Promise((resolve) => pdfStream.on('finish', resolve));

    const zipPath = path.join(tempFolder, `${fileName}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(zipPath, `${fileName}.zip`, (err) => {
        if (err) console.error('Chyba při stahování ZIP:', err);
        fs.unlinkSync(zipPath);
        fs.unlinkSync(pdfPath);
      });
    });

    archive.on('error', (err) => res.status(500).send({ error: err.message }));
    archive.pipe(output);

    archive.file(pdfPath, { name: `${fileName}.pdf` });

    if (attachments && attachments.length > 0) {
      attachments.forEach((file, index) => {
        const fileBuffer = Buffer.from(file.content, 'base64');
        archive.append(fileBuffer, { name: `file${index + 1}_${file.filename}` });
      });
    }

    archive.finalize();
  } catch (error) {
    console.error('Chyba při generování ZIP souboru:', error);
    res.status(500).send('Chyba při generování ZIP souboru: ' + error.message);
  }
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
