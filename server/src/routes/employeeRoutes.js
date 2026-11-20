const express = require('express');

const router = express.Router();

const employees = [
  { id: '1', name: 'Alex Morgan', pod: 'Pod A', weeklyOff: 'Sunday', active: true },
  { id: '2', name: 'Maya Chen', pod: 'Pod B', weeklyOff: 'Monday', active: true },
  { id: '3', name: 'Liam Patel', pod: 'Pod C', weeklyOff: 'Tuesday', active: true },
  { id: '4', name: 'Sofia Bennett', pod: 'Pod A', weeklyOff: 'Wednesday', active: true },
  { id: '5', name: 'Noah Thompson', pod: 'Pod B', weeklyOff: 'Thursday', active: true },
  { id: '6', name: 'Aisha Rahman', pod: 'Pod C', weeklyOff: 'Friday', active: true },
  { id: '7', name: 'Ethan Brooks', pod: 'Pod A', weeklyOff: 'Saturday', active: true },
  { id: '8', name: 'Priya Nair', pod: 'Pod B', weeklyOff: 'Sunday', active: true },
  { id: '9', name: 'Lucas Martin', pod: 'Pod C', weeklyOff: 'Monday', active: true },
  { id: '10', name: 'Emma Wilson', pod: 'Pod A', weeklyOff: 'Tuesday', active: true },
  { id: '11', name: 'Arjun Mehta', pod: 'Pod B', weeklyOff: 'Wednesday', active: true },
  { id: '12', name: 'Olivia Garcia', pod: 'Pod C', weeklyOff: 'Thursday', active: true },
  { id: '13', name: 'Kabir Shah', pod: 'Pod A', weeklyOff: 'Friday', active: true },
  { id: '14', name: 'Grace Kim', pod: 'Pod B', weeklyOff: 'Saturday', active: true },
  { id: '15', name: 'Rohan Das', pod: 'Pod C', weeklyOff: 'Sunday', active: true },
  { id: '16', name: 'Chloe Evans', pod: 'Pod A', weeklyOff: 'Monday', active: true },
  { id: '17', name: 'Zayn Ali', pod: 'Pod B', weeklyOff: 'Tuesday', active: true },
  { id: '18', name: 'Anaya Kapoor', pod: 'Pod C', weeklyOff: 'Wednesday', active: true },
  { id: '19', name: 'Daniel Reed', pod: 'Pod A', weeklyOff: 'Thursday', active: true },
  { id: '20', name: 'Zara Hussain', pod: 'Pod B', weeklyOff: 'Friday', active: true },
  { id: '21', name: 'Mateo Cruz', pod: 'Pod C', weeklyOff: 'Saturday', active: true },
  { id: '22', name: 'Isha Verma', pod: 'Pod A', weeklyOff: 'Sunday', active: true },
  { id: '23', name: 'Henry Cole', pod: 'Pod B', weeklyOff: 'Monday', active: true },
  { id: '24', name: 'Nia Johnson', pod: 'Pod C', weeklyOff: 'Tuesday', active: true },
  { id: '25', name: 'Omar Farouk', pod: 'Pod A', weeklyOff: 'Wednesday', active: true },
  { id: '26', name: 'Ava Mitchell', pod: 'Pod B', weeklyOff: 'Thursday', active: true },
  { id: '27', name: 'Dev Malhotra', pod: 'Pod C', weeklyOff: 'Friday', active: true },
  { id: '28', name: 'Sara Ahmed', pod: 'Pod A', weeklyOff: 'Saturday', active: true },
  { id: '29', name: 'Leo Turner', pod: 'Pod B', weeklyOff: 'Sunday', active: true },
  { id: '30', name: 'Kiara Bose', pod: 'Pod C', weeklyOff: 'Monday', active: true },
  { id: '31', name: 'Finn Ward', pod: 'Pod A', weeklyOff: 'Tuesday', active: false },
  { id: '32', name: 'Tara Sen', pod: 'Pod B', weeklyOff: 'Wednesday', active: false },
];

let nextEmployeeId = 33;

function validateEmployeeFields(employee) {
  const requiredFields = ['name', 'pod', 'weeklyOff'];
  const missingFields = requiredFields.filter(
    (field) =>
      typeof employee[field] !== 'string' || employee[field].trim() === ''
  );

  if (missingFields.length > 0) {
    return `Required fields are missing or invalid: ${missingFields.join(', ')}.`;
  }

  return null;
}

router.get('/', (req, res) => {
  res.json(employees);
});

router.get('/:id', (req, res) => {
  const employee = employees.find((item) => item.id === req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  return res.json(employee);
});

router.post('/', (req, res) => {
  const validationError = validateEmployeeFields(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const employee = {
    id: String(nextEmployeeId++),
    name: req.body.name.trim(),
    pod: req.body.pod.trim(),
    weeklyOff: req.body.weeklyOff.trim(),
    active: typeof req.body.active === 'boolean' ? req.body.active : true,
  };

  employees.push(employee);
  return res.status(201).json(employee);
});

router.put('/:id', (req, res) => {
  const employee = employees.find((item) => item.id === req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const validationError = validateEmployeeFields(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  employee.name = req.body.name.trim();
  employee.pod = req.body.pod.trim();
  employee.weeklyOff = req.body.weeklyOff.trim();

  if (typeof req.body.active === 'boolean') {
    employee.active = req.body.active;
  }

  return res.json(employee);
});

router.delete('/:id', (req, res) => {
  const employeeIndex = employees.findIndex(
    (item) => item.id === req.params.id
  );

  if (employeeIndex === -1) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  employees.splice(employeeIndex, 1);
  return res.json({ message: 'Employee deleted successfully.' });
});

module.exports = router;
module.exports.employees = employees;
