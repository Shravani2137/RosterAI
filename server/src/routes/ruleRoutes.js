const express = require('express');

const router = express.Router();

const rules = [];
const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

let nextRuleId = 1;

function validateRule(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A rule object is required.';
  }

  if (typeof body.brandId !== 'string' || body.brandId.trim() === '') {
    return 'A non-empty brandId is required.';
  }

  if (typeof body.processId !== 'string' || body.processId.trim() === '') {
    return 'A non-empty processId is required.';
  }

  if (typeof body.minimumStaff !== 'number' ||
      !Number.isFinite(body.minimumStaff) || body.minimumStaff <= 0) {
    return 'minimumStaff must be a positive number.';
  }

  if (!Array.isArray(body.workingDays) || body.workingDays.length === 0 ||
      !body.workingDays.every((day) => weekdays.includes(day))) {
    return 'workingDays must be a non-empty array of valid weekdays.';
  }

  if (typeof body.isActive !== 'boolean') {
    return 'isActive must be a boolean.';
  }

  return null;
}

router.get('/', (req, res) => {
  res.json(rules);
});

router.get('/:id', (req, res) => {
  const rule = rules.find((item) => item.id === req.params.id);

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found.' });
  }

  return res.json(rule);
});

router.post('/', (req, res) => {
  const validationError = validateRule(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const rule = {
    id: `rule-${nextRuleId++}`,
    brandId: req.body.brandId.trim(),
    processId: req.body.processId.trim(),
    minimumStaff: req.body.minimumStaff,
    workingDays: [...req.body.workingDays],
    isActive: req.body.isActive,
  };

  rules.push(rule);
  return res.status(201).json(rule);
});

router.put('/:id', (req, res) => {
  const rule = rules.find((item) => item.id === req.params.id);

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found.' });
  }

  const validationError = validateRule(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  rule.brandId = req.body.brandId.trim();
  rule.processId = req.body.processId.trim();
  rule.minimumStaff = req.body.minimumStaff;
  rule.workingDays = [...req.body.workingDays];
  rule.isActive = req.body.isActive;

  return res.json(rule);
});

router.delete('/:id', (req, res) => {
  const ruleIndex = rules.findIndex((item) => item.id === req.params.id);

  if (ruleIndex === -1) {
    return res.status(404).json({ error: 'Rule not found.' });
  }

  rules.splice(ruleIndex, 1);
  return res.json({ message: 'Rule deleted successfully.' });
});

module.exports = router;
module.exports.rules = rules;
