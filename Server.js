// Server.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

// 1) Načteme knihovnu pg
const { Pool } = require('pg');

// 2) Vytvoříme pool připojení k databázi
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// Statické soubory
app.use(express.static(path.join(__dirname, 'public')));

// Hlavní stránka
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Strana0.html'));
});

// GET /api/documents – vrátí seznam všech dokumentů
app.get('/api/documents', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, data FROM documents');
    // Vrátíme pole objektů, kde "id" je z tabulky a zbytek je z data JSON
    const docs = result.rows.map(row => ({ id: row.id, ...row.data }));
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/documents/:id – vrátí konkrétní dokument podle ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query('SELECT id, data FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // Sloučíme id a data do jednoho objektu
    const doc = { id: result.rows[0].id, ...result.rows[0].data };
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/documents – vytvoří nový dokument
app.post('/api/documents', async (req, res) => {
  try {
    // Všechna data uložíme do JSON sloupce
    const data = req.body;
    const insertQuery = 'INSERT INTO documents (data) VALUES ($1) RETURNING id';
    const result = await pool.query(insertQuery, [data]);
    const newId = result.rows[0].id;
    // Vrátíme nový dokument, sloučený s ID
    res.status(201).json({ id: newId, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/documents/:id – aktualizuje existující dokument
app.put('/api/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Všechna nová data uložíme do JSON sloupce
    const data = req.body;
    // Ověříme, zda dokument existuje
    const checkResult = await pool.query('SELECT id FROM documents WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const updateQuery = 'UPDATE documents SET data = $1 WHERE id = $2 RETURNING id';
    const result = await pool.query(updateQuery, [data, id]);
    const updatedId = result.rows[0].id;
    // Vrátíme aktualizovaný dokument
    res.json({ id: updatedId, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/documents/:id – odstraní dokument
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Nejdřív zjistíme, jestli dokument existuje
    const selectResult = await pool.query('SELECT id, data FROM documents WHERE id = $1', [id]);
    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const doc = { id: selectResult.rows[0].id, ...selectResult.rows[0].data };
    // Odstraníme dokument
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    // Vrátíme smazaný dokument
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Endpoint pro generování ZIP (beze změn)
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
