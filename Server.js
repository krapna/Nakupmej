const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'orders.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 📌 Zajištění souboru pro ukládání objednávek
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
}

// 📌 Endpoint pro získání uložených objednávek
app.get('/getOrders', (req, res) => {
    try {
        const orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        res.json(orders);
    } catch (error) {
        console.error('Chyba při čtení orders.json:', error);
        res.status(500).json({ error: 'Chyba při načítání objednávek' });
    }
});

// 📌 Endpoint pro uložení objednávek na server
app.post('/saveOrders', (req, res) => {
    try {
        const { orders } = req.body;
        fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('Chyba při ukládání objednávek:', error);
        res.status(500).json({ error: 'Chyba při ukládání objednávek' });
    }
});

// 📌 Endpoint pro synchronizaci `localStorage` s online verzí
app.post('/syncOrders', (req, res) => {
    try {
        const { localOrders } = req.body;
        const serverOrders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        // Sloučení a odstranění duplicit
        const mergedOrders = [...serverOrders, ...localOrders];
        const uniqueOrders = mergedOrders.reduce((acc, order) => {
            if (!acc.find(o => o.number === order.number)) {
                acc.push(order);
            }
            return acc;
        }, []);

        fs.writeFileSync(DATA_FILE, JSON.stringify(uniqueOrders, null, 2), 'utf8');
        res.json({ success: true, mergedOrders: uniqueOrders });
    } catch (error) {
        console.error('Chyba při synchronizaci objednávek:', error);
        res.status(500).json({ error: 'Chyba při synchronizaci' });
    }
});

// 📌 Endpoint pro generování ZIP souboru
app.post('/generateZip', (req, res) => {
    try {
        const { filledData, attachments, orderNumber } = req.body;
        if (!filledData || !orderNumber) {
            return res.status(400).json({ error: 'Chybějící data' });
        }

        const zipPath = path.join(__dirname, `${orderNumber}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(zipPath, `${orderNumber}.zip`, () => {
                fs.unlinkSync(zipPath);
            });
        });

        archive.on('error', (err) => {
            console.error('Chyba při generování ZIP souboru:', err);
            res.status(500).json({ error: 'Chyba při generování ZIP souboru' });
        });

        archive.pipe(output);

        // Přidání souboru s vyplněnými daty
        archive.append(filledData, { name: `objednavka_${orderNumber}.txt` });

        // Přidání nahraných souborů
        if (attachments && attachments.length > 0) {
            attachments.forEach((file) => {
                const buffer = Buffer.from(file.content, 'base64');
                archive.append(buffer, { name: file.filename });
            });
        }

        archive.finalize();
    } catch (error) {
        console.error('Chyba při zpracování ZIP souboru:', error);
        res.status(500).json({ error: 'Chyba při zpracování ZIP souboru' });
    }
});

// 📌 Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
