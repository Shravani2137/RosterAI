const express = require('express');

const router = express.Router();

const processes = [
  { id: 'process-1', name: 'CS' },
  { id: 'process-2', name: 'Retention' },
  { id: 'process-3', name: 'NDR' },
  { id: 'process-4', name: 'ACC' },
];

let nextProcessId = 5;

function validateProcess(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return 'A non-empty name is required.';
  }

  return null;
}

router.get('/', (req, res) => {
  res.json(processes);
});

router.get('/:id', (req, res) => {
  const process = processes.find((item) => item.id === req.params.id);

  if (!process) {
    return res.status(404).json({ error: 'Process not found.' });
  }

  return res.json(process);
});

router.post('/', (req, res) => {
  const validationError = validateProcess(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const process = {
    id: `process-${nextProcessId++}`,
    name: req.body.name.trim(),
  };

  processes.push(process);
  return res.status(201).json(process);
});

router.put('/:id', (req, res) => {
  const process = processes.find((item) => item.id === req.params.id);

  if (!process) {
    return res.status(404).json({ error: 'Process not found.' });
  }

  const validationError = validateProcess(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  process.name = req.body.name.trim();
  return res.json(process);
});

router.delete('/:id', (req, res) => {
  const processIndex = processes.findIndex((item) => item.id === req.params.id);

  if (processIndex === -1) {
    return res.status(404).json({ error: 'Process not found.' });
  }

  processes.splice(processIndex, 1);
  return res.json({ message: 'Process deleted successfully.' });
});

module.exports = router;
module.exports.processes = processes;
