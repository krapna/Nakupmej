// Server.js – robustní Dropbox upload + idempotentní sdílené odkazy + token refresh
// + omezení Socket.IO echo (menší riziko „nepíše to“ a neskáčících stavů po Hotovo)

const express     = require('express');
const bodyParser  = require('body-parser');
const fs          = require('fs');
const path        = require('path');
const PDFDocument = require('pdfkit');
const archiver    = require('archiver');
const http        = require('http');
const socketIo    = require('socket.io');
const { Dropbox } = require('dropbox');
const fetch       = require('node-fetch');

const { loadData, saveData } = require('./dataon');

// ───────────────────────────────────────────────────────────────────────────────
// Pomocné funkce
// ───────────────────────────────────────────────────────────────────────────────

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Soubor pro perzistenci Dropbox tokenů (na Renderu přežije jen v rámci instanci,
// ale je to lepší než nic; po re-deployi je případně potřeba znovu projít /auth/dropbox)
const TOKENS_PATH = path.join(__dirname, 'dropbox_tokens.json');

let dropboxTokens = {
  access_token: null,
  refresh_token: null,
  expires_at: 0 // unix ms
};

function loadTokensFromDisk() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      dropboxTokens.access_token  = parsed.access_token  || null;
      dropboxTokens.refresh_token = parsed.refresh_token || null;
      dropboxTokens.expires_at    = parsed.expires_at    || 0;
      console.log('Načteny Dropbox tokeny ze souboru.');
    }
  } catch (e) {
    console.warn('Nepodařilo se načíst dropbox_tokens.json:', e.message);
  }
}

function saveTokensToDisk() {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(dropboxTokens, null, 2), 'utf8');
    console.log('Dropbox tokeny uloženy do dropbox_tokens.json.');
  } catch (e) {
    console.warn('Nepodařilo se uložit dropbox_tokens.json:', e.message);
  }
}

function setTokens(access, refresh, expiresInSeconds) {
  if (access)  dropboxTokens.access_token  = access;
  if (refresh) dropboxTokens.refresh_token = refresh;
  if (typeof expiresInSeconds === 'number') {
    // malý pufr 60 s, ať to neexpiruje uprostřed requestu
    dropboxTokens.expires_at = Date.now() + Math.max(0, expiresInSeconds - 60) * 1000;
  }
  saveTokensToDisk();
}

async function refreshAccessTokenIfNeeded() {
  if (!dropboxTokens.access_token) {
    throw new Error('Dropbox token není dostupný. Proveďte přihlášení přes /auth/dropbox.');
  }
  if (Date.now() < dropboxTokens.expires_at) return; // ještě platí

  if (!dropboxTokens.refresh_token) {
    throw new Error('Chybí refresh_token pro obnovu přístupu k Dropboxu.');
  }

  console.log('Obnovuji Dropbox access token…');
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: dropboxTokens.refresh_token,
      client_id:     process.env.DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_APP_SECRET
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Chyba při obnově Dropbox tokenu: ' + errText);
  }
  const data = await res.json();
  console.log('Dropbox token obnoven.');
  setTokens(data.access_token, dropboxTokens.refresh_token, data.expires_in);
}

async function getDropboxClient() {
  await refreshAccessTokenIfNeeded();
  return new Dropbox({ accessToken: dropboxTokens.access_token, fetch });
}

// ───────────────────────────────────────────────────────────────────────────────
// Express / Socket.IO
// ───────────────────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io     = socketIo(server, { pingTimeout: 30000, pingInterval: 10000 });

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Načteme tokeny při startu
loadTokensFromDisk();

// ───────────────────────────────────────────────────────────────────────────────
// OAuth2 – Dropbox
// ───────────────────────────────────────────────────────────────────────────────

app.get('/auth/dropbox', (req, res) => {
  const dropboxAuthUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  dropboxAuthUrl.searchParams.set('client_id',     process.env.DROPBOX_APP_KEY);
  dropboxAuthUrl.searchParams.set('redirect_uri',  'https://nakupmej.onrender.com/auth/dropbox/callback');
  dropboxAuthUrl.searchParams.set('response_type', 'code');
  dropboxAuthUrl.searchParams.set('token_access_type', 'offline'); // chceme refresh_token
  res.redirect(dropboxAuthUrl.toString());
});

app.get('/auth/dropbox/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Chybí parametr code.');

  try {
    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type:   'authorization_code',
        client_id:     process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        redirect_uri:  'https://nakupmej.onrender.com/auth/dropbox/callback'
      })
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return res.status(500).send('Chyba při získávání tokenu: ' + errText);
    }
    const tokenData = await tokenRes.json();
    console.log('Dropbox tokeny získány (callback).');
    setTokens(tokenData.access_token, tokenData.refresh_token, tokenData.expires_in);
    res.redirect('/Strana1.html');
  } catch (err) {
    console.error('OAuth2 callback chyba:', err);
    res.status(500).send('OAuth2 chyba: ' + err.message);
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Generování ZIP (PDF + přílohy – přílohy zatím vypnuté)
// ───────────────────────────────────────────────────────────────────────────────

app.post('/generateZip', async (req, res) => {
  const { filledData, attachments, orderNumber } = req.body;
  try {
    if (!filledData || filledData.trim() === "") {
      throw new Error("filledData je prázdné, PDF se nevygeneruje.");
    }

    const tempFolder = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);
    const fileName = orderNumber || 'Dokument';
    const pdfPath  = path.join(tempFolder, `${fileName}.pdf`);

    const pdfDoc   = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(pdfStream);

    pdfDoc.font('Helvetica')
      .fontSize(14)
      .text(stripDiacritics('Souhrn vyplněných formulářů'), { align: 'center' });

    pdfDoc.moveDown(2);
    filledData.split('\n').forEach(line => {
      pdfDoc.fontSize(12).text(stripDiacritics(line), { align: 'left' });
      pdfDoc.moveDown(0.5);
    });

    pdfDoc.end();
    await new Promise(resolve => pdfStream.on('finish', resolve));

    const zipPath = path.join(tempFolder, `${fileName}.zip`);
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(zipPath, `${fileName}.zip`, err => {
        if (err) console.error('Chyba download ZIP:', err);
        try { fs.unlinkSync(pdfPath); } catch {}
        try { fs.unlinkSync(zipPath); } catch {}
      });
    });
    archive.on('error', err => res.status(500).send({ error: err.message }));

    archive.pipe(output);
    archive.file(pdfPath, { name: `${fileName}.pdf` });
    // Pokud budeš chtít přidávat přílohy do ZIPu, tady to odkomentujeme a doplníme.

    archive.finalize();

  } catch (err) {
    console.error('ZIP generování selhalo:', err);
    res.status(500).send('Chyba při generování ZIP: ' + err.message);
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Upload do Dropboxu + tvorba sdíleného odkazu (idempotentní)
// ───────────────────────────────────────────────────────────────────────────────

app.post('/uploadToDropbox', async (req, res) => {
  const { base64Data, fileName } = req.body;
  if (!base64Data || !fileName) {
    return res.status(400).json({ success: false, error: 'Chybí base64Data nebo fileName.' });
  }

  async function doUploadOnce() {
    const dbx = await getDropboxClient();
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const dropboxPath = '/' + fileName;

    // 1) Upload s autorename (předejde kolizím názvů)
    let normalizedPath;
    try {
      const uploadRes = await dbx.filesUpload({
        path: dropboxPath,
        contents: fileBuffer,
        mode: { '.tag': 'add' },
        autorename: true,
        mute: false,
        strict_conflict: false
      });
      normalizedPath = uploadRes.result.path_lower;
    } catch (err) {
      const status  = err.status || err.statusCode;
      const summary = err?.error?.error_summary || err?.error_summary || '';
      // path/conflict -> soubor tam už je: vezmeme jeho metadata a použijeme existující
      if (status === 409 && /path\/conflict/i.test(summary)) {
        const metaRes = await dbx.filesGetMetadata({ path: dropboxPath });
        normalizedPath = metaRes.result.path_lower;
      } else {
        throw err;
      }
    }

    // 2) Vytvořit sdílený odkaz, nebo vzít existující (idempotentně)
    try {
      const shareRes = await dbx.sharingCreateSharedLinkWithSettings({ path: normalizedPath });
      return shareRes.result.url.replace('?dl=0', '?dl=1');
    } catch (err) {
      const status  = err.status || err.statusCode;
      const summary = err?.error?.error_summary || err?.error_summary || '';
      if (status === 409 || /shared_link_already_exists|sdílený_odkaz_již_existuje/i.test(summary)) {
        const listRes = await dbx.sharingListSharedLinks({ path: normalizedPath, direct_only: true });
        if (listRes.result.links.length > 0) {
          console.info('Sdílený odkaz už existoval – použit stávající.');
          return listRes.result.links[0].url.replace('?dl=0', '?dl=1');
        }
      }
      throw err;
    }
  }

  try {
    const link = await doUploadOnce();
    return res.json({ success: true, link });
  } catch (err) {
    const status  = err.status || err.statusCode;
    const tag     = err?.error?.['.tag'] || err?.error?.error?.['.tag'] || '';
    const summary = err?.error?.error_summary || err?.error_summary || '';
    // Při 401 zkusíme refresh a jeden retry
    if (status === 401 || /expired_access_token/i.test(tag) || /expired_access_token/i.test(summary)) {
      try {
        await refreshAccessTokenIfNeeded();
        const link = await doUploadOnce();
        return res.json({ success: true, link });
      } catch (e2) {
        console.error('Retry upload selhal:', e2);
        return res.status(500).json({ success: false, error: e2?.error_summary || e2.message });
      }
    }
    console.error('Upload do Dropboxu selhal:', summary || err.message);
    return res.status(500).json({ success: false, error: summary || err.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Data + Socket.IO
// ───────────────────────────────────────────────────────────────────────────────

let documents = loadData();

io.on('connection', socket => {
  // Tyto logy jsou šum při health-checkech / více tabech; klidíme je:
  // console.log('Nový klient připojen');

  socket.on('requestDocuments', () => {
    socket.emit('updateDocuments', documents);
  });

  socket.on('updateDocuments', updated => {
    documents = updated;
    saveData(documents);

    // neposílej echo zpět odesílateli -> míň „přeskakování“ formulářů pod rukama
    socket.broadcast.emit('updateDocuments', documents);
  });

  socket.on('disconnect', () => {
    // console.log('Klient se odpojil');
  });
});

server.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
