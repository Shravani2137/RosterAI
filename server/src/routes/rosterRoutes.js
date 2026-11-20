const express = require('express');
const employeeRoutes = require('./employeeRoutes');
const brandRoutes = require('./brandRoutes');
const processRoutes = require('./processRoutes');
const ruleRoutes = require('./ruleRoutes');
const assignmentRoutes = require('./assignmentRoutes');

const router = express.Router();
const rosters = [];
const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const weekdayAbbreviations = {
  sunday: 'sun',
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
};

function isValidAssignment(assignment, employees, brands, processes) {
  return assignment &&
    typeof assignment.employeeId === 'string' &&
    employees.some((employee) => employee.id === assignment.employeeId) &&
    typeof assignment.brandId === 'string' &&
    brands.some((brand) => brand.id === assignment.brandId) &&
    typeof assignment.processId === 'string' &&
    processes.some((process) => process.id === assignment.processId);
}

function isEmployeeOff(employee, weekday) {
  if (typeof employee.weeklyOff !== 'string') {
    return false;
  }

  const weeklyOff = employee.weeklyOff.trim().toLowerCase();
  return weeklyOff === weekday.toLowerCase() ||
    weeklyOff === weekdayAbbreviations[weekday.toLowerCase()];
}

function getRuleConfigurations(brands, processes, rules, conflicts) {
  if (rules.length === 0) {
    return brands.flatMap((brand) =>
      processes.map((process) => ({
        brand,
        process,
        minimumStaff: 1,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        ruleId: null,
      })),
    );
  }

  const configurations = [];
  const configuredPairs = new Set();

  rules.filter((rule) => rule.isActive).forEach((rule) => {
    const brand = brands.find((item) => item.id === rule.brandId);
    const process = processes.find((item) => item.id === rule.processId);

    if (!brand || !process) {
      conflicts.push({
        type: 'invalid-rule-reference',
        ruleId: rule.id,
        brandId: rule.brandId,
        processId: rule.processId,
      });
      return;
    }

    const pairKey = `${brand.id}|${process.id}`;
    if (configuredPairs.has(pairKey)) {
      conflicts.push({
        type: 'duplicate-rule',
        brandId: brand.id,
        processId: process.id,
      });
      return;
    }

    configuredPairs.add(pairKey);
    configurations.push({
      brand,
      process,
      minimumStaff: Math.ceil(rule.minimumStaff),
      workingDays: rule.workingDays,
      ruleId: rule.id,
    });
  });

  return configurations;
}

router.get('/', (req, res) => {
  return res.json(rosters);
});

router.post('/generate', (req, res) => {
  const body = req.body || {};
  const { month, year } = body;
  if (!Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 1900 || year > 9999) {
    return res.status(400).json({
      error: 'month must be an integer from 1 to 12 and year must be a valid four-digit year.',
    });
  }

  const employees = employeeRoutes.employees;
  const brands = brandRoutes.brands;
  const processes = processRoutes.processes;
  const rules = ruleRoutes.rules;
  const activeEmployees = employees.filter((employee) => employee.active !== false);

  let assignments;
  let assignmentSource;
  if (body.assignments === undefined) {
    assignments = assignmentRoutes.assignments;
    assignmentSource = 'stored';
  } else if (!Array.isArray(body.assignments) ||
      !body.assignments.every((assignment) =>
        isValidAssignment(assignment, employees, brands, processes),
      )) {
    return res.status(400).json({
      error: 'assignments must be an array of valid employeeId, brandId, and processId records.',
    });
  } else {
    assignments = body.assignments;
    assignmentSource = 'provided';
  }

  const conflicts = [];
  const configurations = getRuleConfigurations(brands, processes, rules, conflicts);
  const assignmentsByPair = new Map();
  assignments.forEach((assignment) => {
    const pairKey = `${assignment.brandId}|${assignment.processId}`;
    if (!assignmentsByPair.has(pairKey)) {
      assignmentsByPair.set(pairKey, new Set());
    }
    assignmentsByPair.get(pairKey).add(assignment.employeeId);
  });

  const shifts = [];
  const coverageGaps = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekday = weekdays[date.getUTCDay()];
    const dailyShifts = configurations.filter((configuration) =>
      configuration.workingDays.includes(weekday),
    );
    const shiftOffset = dailyShifts.length ? (day - 1) % dailyShifts.length : 0;
    const orderedShifts = [
      ...dailyShifts.slice(shiftOffset),
      ...dailyShifts.slice(0, shiftOffset),
    ];
    const scheduledEmployeeIds = new Set();

    orderedShifts.forEach((configuration) => {
      const { brand, process, minimumStaff, ruleId } = configuration;
      const pairKey = `${brand.id}|${process.id}`;
      const assignedIds = assignmentsByPair.get(pairKey) || new Set();
      const eligibleEmployees = activeEmployees.filter(
        (employee) => assignedIds.has(employee.id) && !isEmployeeOff(employee, weekday),
      );
      const employeeOffset = eligibleEmployees.length ? (day - 1) % eligibleEmployees.length : 0;
      const orderedEmployees = [
        ...eligibleEmployees.slice(employeeOffset),
        ...eligibleEmployees.slice(0, employeeOffset),
      ];
      const scheduledEmployees = [];
      const blockedEmployees = [];

      orderedEmployees.forEach((employee) => {
        if (scheduledEmployees.length >= minimumStaff) {
          return;
        }
        if (scheduledEmployeeIds.has(employee.id)) {
          blockedEmployees.push(employee.id);
          return;
        }

        scheduledEmployeeIds.add(employee.id);
        scheduledEmployees.push(employee);
      });

      const gap = Math.max(0, minimumStaff - scheduledEmployees.length);
      const shift = {
        date: dateString,
        brandId: brand.id,
        brandName: brand.name,
        processId: process.id,
        processName: process.name,
        ruleId,
        requiredStaff: minimumStaff,
        assignedStaff: scheduledEmployees.length,
        employeeIds: scheduledEmployees.map((employee) => employee.id),
        employees: scheduledEmployees.map(({ id, name }) => ({ id, name })),
        status: gap === 0 ? 'covered' : scheduledEmployees.length === 0 ? 'uncovered' : 'partial',
        gap,
      };

      shifts.push(shift);

      if (gap > 0) {
        const coverageGap = {
          type: scheduledEmployees.length === 0 ? 'uncovered-shift' : 'insufficient-staffing',
          date: dateString,
          brandId: brand.id,
          brandName: brand.name,
          processId: process.id,
          processName: process.name,
          requiredStaff: minimumStaff,
          assignedStaff: scheduledEmployees.length,
          gap,
          reason: eligibleEmployees.length === 0
            ? 'No active assigned employee is available for this shift.'
            : 'Available employees are already assigned to another shift or staffing is insufficient.',
        };
        coverageGaps.push(coverageGap);
        conflicts.push(coverageGap);
      }

      blockedEmployees.forEach((employeeId) => {
        conflicts.push({
          type: 'double-booking-prevented',
          date: dateString,
          employeeId,
          brandId: brand.id,
          processId: process.id,
          message: 'Employee was already assigned to another shift on this date.',
        });
      });
    });
  }

  const roster = {
    id: `roster-${year}-${String(month).padStart(2, '0')}`,
    month,
    year,
    generatedAt: new Date().toISOString(),
    assignmentSource,
    assignments: assignments.map((assignment) => ({ ...assignment })),
    shifts,
  };
  const existingRosterIndex = rosters.findIndex(
    (item) => item.month === month && item.year === year,
  );
  if (existingRosterIndex === -1) {
    rosters.push(roster);
  } else {
    rosters[existingRosterIndex] = roster;
  }

  return res.status(201).json({ roster, coverageGaps, conflicts });
});

router.post('/validate', (req, res) => {
  const latestRoster = rosters.reduce((latest, roster) =>
    !latest || roster.generatedAt > latest.generatedAt ? roster : latest,
  null);

  if (!latestRoster) {
    return res.status(404).json({ error: 'No generated roster is available to validate.' });
  }

  const employees = employeeRoutes.employees;
  const brands = brandRoutes.brands;
  const processes = processRoutes.processes;
  const rules = ruleRoutes.rules;
  const assignments = assignmentRoutes.assignments;
  const configurationIssues = [];
  const configurations = getRuleConfigurations(
    brands,
    processes,
    rules,
    configurationIssues,
  );
  const configurationsByPair = new Map(
    configurations.map((configuration) => [
      `${configuration.brand.id}|${configuration.process.id}`,
      configuration,
    ]),
  );
  const issues = [];

  function addIssue(type, severity, message, shift, details = {}) {
    issues.push({
      type,
      severity,
      date: shift ? shift.date : details.date || null,
      brandId: shift ? shift.brandId : details.brandId || null,
      brandName: shift ? shift.brandName : details.brandName || null,
      processId: shift ? shift.processId : details.processId || null,
      processName: shift ? shift.processName : details.processName || null,
      message,
      details,
    });
  }

  configurationIssues.forEach((configurationIssue) => {
    addIssue(
      configurationIssue.type,
      'error',
      'An active rule references an unknown brand or process, or duplicates another rule.',
      null,
      configurationIssue,
    );
  });

  const shiftsByKey = new Map();
  const employeeShiftsByDate = new Map();

  latestRoster.shifts.forEach((shift) => {
    const pairKey = `${shift.brandId}|${shift.processId}`;
    const shiftKey = `${shift.date}|${pairKey}`;
    shiftsByKey.set(shiftKey, (shiftsByKey.get(shiftKey) || 0) + 1);
    const configuration = configurationsByPair.get(pairKey);
    const shiftDate = new Date(`${shift.date}T00:00:00Z`);
    const weekday = weekdays[shiftDate.getUTCDay()];

    if (configuration && !configuration.workingDays.includes(weekday)) {
      addIssue(
        'non-working-day-shift',
        'error',
        'A shift is scheduled outside its rule working days.',
        shift,
        { weekday, workingDays: configuration.workingDays },
      );
    }

    const requiredStaff = configuration
      ? configuration.minimumStaff
      : Number(shift.requiredStaff) || 1;
    const shiftEmployeeIds = Array.isArray(shift.employeeIds) ? shift.employeeIds : [];
    const validEmployeeIds = new Set();

    shiftEmployeeIds.forEach((employeeId) => {
      const employee = employees.find((item) => item.id === employeeId);
      const dateEmployeeKey = `${shift.date}|${employeeId}`;
      const previousShift = employeeShiftsByDate.get(dateEmployeeKey);

      if (previousShift) {
        addIssue(
          'multiple-shifts-same-date',
          'error',
          'An employee is assigned to multiple shifts on the same date.',
          shift,
          {
            employeeId,
            previousBrandId: previousShift.brandId,
            previousProcessId: previousShift.processId,
          },
        );
      } else {
        employeeShiftsByDate.set(dateEmployeeKey, shift);
      }

      if (!employee) {
        addIssue(
          'unknown-employee',
          'error',
          'The roster references an employee that is not stored.',
          shift,
          { employeeId },
        );
        return;
      }

      if (employee.active === false) {
        addIssue(
          'inactive-employee',
          'error',
          'An inactive employee is assigned to a shift.',
          shift,
          { employeeId, employeeName: employee.name },
        );
        return;
      }

      if (isEmployeeOff(employee, weekday)) {
        addIssue(
          'weekly-off-assignment',
          'error',
          'An employee is assigned on their weekly off.',
          shift,
          { employeeId, employeeName: employee.name, weekday },
        );
        return;
      }

      const hasMatchingAssignment = assignments.some(
        (assignment) =>
          assignment.employeeId === employeeId &&
          assignment.brandId === shift.brandId &&
          assignment.processId === shift.processId,
      );
      if (!hasMatchingAssignment) {
        addIssue(
          'missing-assignment',
          'error',
          'The employee has no stored assignment for this brand and process.',
          shift,
          { employeeId, employeeName: employee.name },
        );
        return;
      }

      if (!previousShift) {
        validEmployeeIds.add(employeeId);
      }
    });

    if (validEmployeeIds.size === 0) {
      addIssue(
        'uncovered-shift',
        'critical',
        'No valid employee covers this brand/process shift.',
        shift,
        { requiredStaff, assignedStaff: 0 },
      );
    }

    if (validEmployeeIds.size < requiredStaff) {
      addIssue(
        'minimum-staffing-violation',
        'critical',
        'The shift has fewer valid employees than the required minimum.',
        shift,
        {
          requiredStaff,
          assignedStaff: validEmployeeIds.size,
          gap: requiredStaff - validEmployeeIds.size,
        },
      );
    }
  });

  const daysInMonth = new Date(Date.UTC(latestRoster.year, latestRoster.month, 0)).getUTCDate();
  configurations.forEach((configuration) => {
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(latestRoster.year, latestRoster.month - 1, day));
      const weekday = weekdays[date.getUTCDay()];
      if (!configuration.workingDays.includes(weekday)) {
        continue;
      }

      const dateString = `${latestRoster.year}-${String(latestRoster.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const shiftKey = `${dateString}|${configuration.brand.id}|${configuration.process.id}`;
      if (!shiftsByKey.has(shiftKey)) {
        const missingShift = {
          date: dateString,
          brandId: configuration.brand.id,
          brandName: configuration.brand.name,
          processId: configuration.process.id,
          processName: configuration.process.name,
        };
        addIssue(
          'uncovered-shift',
          'critical',
          'A required working-day shift is missing from the generated roster.',
          missingShift,
          { requiredStaff: configuration.minimumStaff, assignedStaff: 0 },
        );
        addIssue(
          'minimum-staffing-violation',
          'critical',
          'The missing shift has no staff against its required minimum.',
          missingShift,
          {
            requiredStaff: configuration.minimumStaff,
            assignedStaff: 0,
            gap: configuration.minimumStaff,
          },
        );
      }
    }
  });

  const summary = issues.reduce(
    (counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    },
    { critical: 0, error: 0, warning: 0 },
  );

  return res.json({
    rosterId: latestRoster.id,
    month: latestRoster.month,
    year: latestRoster.year,
    isValid: issues.length === 0,
    totalIssues: issues.length,
    summary,
    issues,
  });
});

module.exports = router;
module.exports.rosters = rosters;
