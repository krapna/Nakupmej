const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// 📌 Poskytování statických souborů (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 📌 Oprava přesměrování na hlavní stránku
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Strana0.html'));
});

// 📌 Cesta k souboru pro ukládání objednávek
const DATA_FILE = path.join(__dirname, 'orders.json');

// 📌 Načítání objednávek (pro všechna zařízení)
app.get('/getOrders', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        return res.json([]);
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
});

// 📌 Ukládání objednávek (sdílení mezi zařízeními)
app.post('/saveOrders', (req, res) => {
    const { orders } = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
    res.json({ success: true });
});

// 📌 Endpoint pro synchronizaci dat mezi `localStorage` a serverem
app.post('/syncOrders', (req, res) => {
    try {
        const { localOrders } = req.body;
        let serverOrders = [];

        if (fs.existsSync(DATA_FILE)) {
            serverOrders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        // 📌 Sloučení a odstranění duplicit podle čísla objednávky
        const mergedOrders = [...serverOrders, ...localOrders].reduce((acc, order) => {
            if (!acc.find(o => o.number === order.number)) {
                acc.push(order);
            }
            return acc;
        }, []);

        fs.writeFileSync(DATA_FILE, JSON.stringify(mergedOrders, null, 2), 'utf8');
        res.json({ success: true, mergedOrders });
    } catch (error) {
        console.error('Chyba při synchronizaci objednávek:', error);
        res.status(500).json({ error: 'Chyba při synchronizaci' });
    }
});

// 📌 Endpoint pro generování ZIP souboru
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

        // 📌 Vytvoření PDF souboru
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

        // 📌 Vytvoření ZIP souboru
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

// 📌 Spuštění serveru na zadaném portu
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
