const express = require('express');

const router = express.Router();

const brands = [
  { id: 'brand-1', name: 'Brand Alpha' },
  { id: 'brand-2', name: 'Brand Beta' },
  { id: 'brand-3', name: 'Brand Gamma' },
];

let nextBrandId = 4;

function validateBrand(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return 'A non-empty name is required.';
  }

  return null;
}

router.get('/', (req, res) => {
  res.json(brands);
});

router.get('/:id', (req, res) => {
  const brand = brands.find((item) => item.id === req.params.id);

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found.' });
  }

  return res.json(brand);
});

router.post('/', (req, res) => {
  const validationError = validateBrand(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const brand = {
    id: `brand-${nextBrandId++}`,
    name: req.body.name.trim(),
  };

  brands.push(brand);
  return res.status(201).json(brand);
});

router.put('/:id', (req, res) => {
  const brand = brands.find((item) => item.id === req.params.id);

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found.' });
  }

  const validationError = validateBrand(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  brand.name = req.body.name.trim();
  return res.json(brand);
});

router.delete('/:id', (req, res) => {
  const brandIndex = brands.findIndex((item) => item.id === req.params.id);

  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found.' });
  }

  brands.splice(brandIndex, 1);
  return res.json({ message: 'Brand deleted successfully.' });
});

module.exports = router;
module.exports.brands = brands;
