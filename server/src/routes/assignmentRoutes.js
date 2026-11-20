const express = require('express');
const employeeRoutes = require('./employeeRoutes');
const brandRoutes = require('./brandRoutes');
const processRoutes = require('./processRoutes');

const router = express.Router();
const activeEmployees = employeeRoutes.employees.filter(
  (employee) => employee.active !== false,
);
const brands = brandRoutes.brands;
const processes = processRoutes.processes;
const assignments = [];

brands.forEach((brand, brandIndex) => {
  processes.forEach((process, processIndex) => {
    for (let offset = 0; offset < 5; offset += 1) {
      const employeeIndex =
        (brandIndex * 7 + processIndex * 3 + offset * 5) % activeEmployees.length;
      assignments.push({
        id: `assignment-${assignments.length + 1}`,
        employeeId: activeEmployees[employeeIndex].id,
        brandId: brand.id,
        processId: process.id,
      });
    }
  });
});

let nextAssignmentId = assignments.length + 1;

function validateAssignment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'An assignment object is required.';
  }

  const requiredIds = ['employeeId', 'brandId', 'processId'];
  const missingIds = requiredIds.filter(
    (field) => typeof body[field] !== 'string' || body[field].trim() === '',
  );
  if (missingIds.length > 0) {
    return `Required assignment fields are missing or invalid: ${missingIds.join(', ')}.`;
  }

  if (!employeeRoutes.employees.some((employee) => employee.id === body.employeeId)) {
    return 'employeeId does not match an existing employee.';
  }
  if (!brands.some((brand) => brand.id === body.brandId)) {
    return 'brandId does not match an existing brand.';
  }
  if (!processes.some((process) => process.id === body.processId)) {
    return 'processId does not match an existing process.';
  }

  return null;
}

router.get('/', (req, res) => {
  return res.json(assignments);
});

router.post('/', (req, res) => {
  const validationError = validateAssignment(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const assignment = {
    id: `assignment-${nextAssignmentId++}`,
    employeeId: req.body.employeeId.trim(),
    brandId: req.body.brandId.trim(),
    processId: req.body.processId.trim(),
  };
  assignments.push(assignment);
  return res.status(201).json(assignment);
});

router.delete('/:id', (req, res) => {
  const assignmentIndex = assignments.findIndex(
    (assignment) => assignment.id === req.params.id,
  );
  if (assignmentIndex === -1) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  assignments.splice(assignmentIndex, 1);
  return res.json({ message: 'Assignment deleted successfully.' });
});

module.exports = router;
module.exports.assignments = assignments;
