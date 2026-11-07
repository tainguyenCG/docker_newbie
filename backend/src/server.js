require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { waitAndInitDb } = require('./config/db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy endpoint' }));

async function start() {
  await waitAndInitDb();
  app.listen(PORT, () => {
    console.log(`[server] API running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
