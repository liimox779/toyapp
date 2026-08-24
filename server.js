import 'dotenv/config';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

import { authRouter } from './src/routes/auth.routes.js';
import { productsRouter } from './src/routes/products.routes.js';
import { searchRouter } from './src/routes/search.routes.js';
import { logsRouter } from './src/routes/logs.routes.js';
import { dashboardRouter } from './src/routes/dashboard.routes.js';
import { usersRouter } from './src/routes/users.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

app.use(express.json());
app.use(cookieParser());

// index.html is gated behind a valid session; every other static asset (css/js/login.html) is public.
app.get(['/', '/index.html'], (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/login.html');
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  } catch {
    res.clearCookie('token');
    res.redirect('/login.html');
  }
});

app.use(express.static(PUBLIC_DIR, { index: false }));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/logs', logsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

console.log('DIAG openssl:', process.versions.openssl, 'node:', process.version, 'platform:', process.platform, process.report?.getReport?.()?.header?.glibcVersionRuntime);
import('child_process').then(({ execSync }) => {
  try { console.log('DIAG os-release:', execSync('cat /etc/os-release').toString()); } catch (e) { console.log('DIAG os-release failed:', e.message); }
  try { console.log('DIAG ldd:', execSync('ldd --version 2>&1 | head -1').toString()); } catch (e) { console.log('DIAG ldd failed:', e.message); }
  try { console.log('DIAG openssl-cli:', execSync('openssl version').toString()); } catch (e) { console.log('DIAG openssl-cli failed:', e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Visual Product Search running at http://localhost:${PORT}`);
});

// Dev-only HTTPS listener (self-signed cert) so the camera-based barcode
// scanner works from other devices on the LAN — getUserMedia requires a
// secure context, which plain HTTP over a LAN IP does not satisfy.
const CERT_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
  https
    .createServer({ key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) }, app)
    .listen(HTTPS_PORT, () => {
      console.log(`Visual Product Search (HTTPS, self-signed) running at https://localhost:${HTTPS_PORT}`);
    });
}
