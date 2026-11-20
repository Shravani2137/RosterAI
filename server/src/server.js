const express = require('express');
const cors = require('cors');
require('dotenv').config();
const employeeRoutes = require('./routes/employeeRoutes');
const podRoutes = require('./routes/podRoutes');
const processRoutes = require('./routes/processRoutes');
const brandRoutes = require('./routes/brandRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const rosterRoutes = require('./routes/rosterRoutes');

const app = express();

const developmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : [
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'null',
    ];
const allowedOrigins = new Set([
  ...developmentOrigins,
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
]);

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'RosterIQ backend is running!' });
});

app.use('/api/employees', employeeRoutes);
app.use('/api/pods', podRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/rosters', rosterRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
