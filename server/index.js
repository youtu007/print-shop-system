// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/printers', require('./routes/printers'));
app.use('/api/groups',   require('./routes/groups'));
app.use('/api/print',    require('./routes/print'));
app.use('/api/shop',     require('./routes/shop'));
app.use('/api/admin',    require('./routes/admin'));

// Serve Vue build in production
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (require('fs').existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
