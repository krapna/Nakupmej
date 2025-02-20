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

// 📌 Poskytování statických souborů
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
            const existingOrder = acc.find(o => o.number === order.number);
            if (existingOrder) {
                // 📌 Pokud existuje, přepíše se novějšími daty
                Object.assign(existingOrder, order);
            } else {
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

// 📌 Endpoint pro trvalé odstranění objednávky ze serveru
app.post('/deleteOrder', (req, res) => {
    try {
        const { number } = req.body;
        if (!number) {
            return res.status(400).json({ error: 'Nebyl poskytnut platný číslo objednávky' });
        }

        let orders = [];
        if (fs.existsSync(DATA_FILE)) {
            orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        // 📌 Odstranění objednávky podle čísla
        const updatedOrders = orders.filter(order => order.number !== number);

        // 📌 Uložení zpět do souboru orders.json
        fs.writeFileSync(DATA_FILE, JSON.stringify(updatedOrders, null, 2), 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Chyba při mazání objednávky:', error);
        res.status(500).json({ error: 'Chyba při mazání' });
    }
});

// 📌 Spuštění serveru na zadaném portu
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
