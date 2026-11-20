const express = require('express');

const router = express.Router();

const pods = [
  { id: 'pod-1', name: 'Pod A' },
  { id: 'pod-2', name: 'Pod B' },
  { id: 'pod-3', name: 'Pod C' },
];

let nextPodId = 4;

function validatePod(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return 'A non-empty name is required.';
  }

  return null;
}

router.get('/', (req, res) => {
  res.json(pods);
});

router.get('/:id', (req, res) => {
  const pod = pods.find((item) => item.id === req.params.id);

  if (!pod) {
    return res.status(404).json({ error: 'Pod not found.' });
  }

  return res.json(pod);
});

router.post('/', (req, res) => {
  const validationError = validatePod(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const pod = {
    id: `pod-${nextPodId++}`,
    name: req.body.name.trim(),
  };

  pods.push(pod);
  return res.status(201).json(pod);
});

router.put('/:id', (req, res) => {
  const pod = pods.find((item) => item.id === req.params.id);

  if (!pod) {
    return res.status(404).json({ error: 'Pod not found.' });
  }

  const validationError = validatePod(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  pod.name = req.body.name.trim();
  return res.json(pod);
});

router.delete('/:id', (req, res) => {
  const podIndex = pods.findIndex((item) => item.id === req.params.id);

  if (podIndex === -1) {
    return res.status(404).json({ error: 'Pod not found.' });
  }

  pods.splice(podIndex, 1);
  return res.json({ message: 'Pod deleted successfully.' });
});

module.exports = router;
