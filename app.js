const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const state = {
  month: getCurrentMonthString(),
  employees: [],
  pods: [],
  brands: [],
  processes: [],
  assignments: [],
  generatedRoster: null,
  generatedCoverageGaps: null,
  validationReport: null,
  validationStale: false,
  leaveRecords: [],
  holidays: {},
  publicHolidays: {},
  manualOverrides: {},
};

const STORAGE_KEY = 'smart-roster-state-v1';
const API_BASE_URL = (window.ROSTERIQ_API_BASE_URL || 'http://localhost:5000/api')
  .replace(/\/+$/, '');
const WEEK_DAYS = [
  { short: 'Sun', full: 'Sunday' },
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
];

function getCurrentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function saveState() {
  const persistable = {
    month: state.month,
    employees: state.employees,
    pods: state.pods,
    brands: state.brands,
    processes: state.processes,
    assignments: state.assignments,
    leaveRecords: state.leaveRecords,
    publicHolidays: state.publicHolidays,
    manualOverrides: state.manualOverrides,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function toISODate(dateObj) {
  const year = dateObj.getFullYear();
  const month = padNumber(dateObj.getMonth() + 1);
  const day = padNumber(dateObj.getDate());
  return `${year}-${month}-${day}`;
}

function dayNameFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return dayNames[date.getDay()];
}

function createHolidaySet(year, monthIndex) {
  const dates = new Set();
  const monthStart = new Date(year, monthIndex, 1);

  const add = (day) => {
    const holiday = new Date(year, monthIndex, day);
    dates.add(toISODate(holiday));
  };

  add(1);
  add(4);
  add(12);
  add(14);
  add(22);
  add(26);
  add(28);

  if (monthStart.getDay() === 0) {
    add(2);
  }

  Object.keys(state.publicHolidays).forEach((dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    if (date.getFullYear() === year && date.getMonth() === monthIndex) {
      dates.add(dateStr);
    }
  });

  return dates;
}

function getProcessRule(brand, processId) {
  return brand.processRules[processId] || {
    minimumStaff: 1,
    operatingRule: 'weekday-no-holiday',
  };
}

function buildSampleData() {
  const pods = [
    { id: 'pod-alpha', name: 'Pod Alpha' },
    { id: 'pod-beta', name: 'Pod Beta' },
    { id: 'pod-gamma', name: 'Pod Gamma' },
  ];

  const processes = [
    { id: 'cs', name: 'Customer Support', defaultRule: 'weekday-no-holiday', defaultCoverage: 2 },
    { id: 'acc', name: 'Abandoned Cart', defaultRule: 'all-days', defaultCoverage: 1 },
    { id: 'retention', name: 'Retention', defaultRule: 'weekday-no-holiday', defaultCoverage: 1 },
    { id: 'ndr', name: 'NDR', defaultRule: 'all-days', defaultCoverage: 1 },
  ];

  const employees = [
    { id: 'emp-01', name: 'Aditi Rao', podId: 'pod-alpha', weeklyOff: 'Sun' },
    { id: 'emp-02', name: 'Rahul Menon', podId: 'pod-alpha', weeklyOff: 'Mon' },
    { id: 'emp-03', name: 'Meera Shah', podId: 'pod-alpha', weeklyOff: 'Tue' },
    { id: 'emp-04', name: 'Karan Singh', podId: 'pod-alpha', weeklyOff: 'Wed' },
    { id: 'emp-05', name: 'Priya Varma', podId: 'pod-alpha', weeklyOff: 'Thu' },
    { id: 'emp-06', name: 'Nisha Jain', podId: 'pod-alpha', weeklyOff: 'Fri' },
    { id: 'emp-07', name: 'Vishal Das', podId: 'pod-alpha', weeklyOff: 'Sat' },
    { id: 'emp-08', name: 'Rohan Iyer', podId: 'pod-alpha', weeklyOff: 'Sun' },
    { id: 'emp-09', name: 'Sana Nair', podId: 'pod-beta', weeklyOff: 'Mon' },
    { id: 'emp-10', name: 'Deepak Kumar', podId: 'pod-beta', weeklyOff: 'Tue' },
    { id: 'emp-11', name: 'Ishita Roy', podId: 'pod-beta', weeklyOff: 'Wed' },
    { id: 'emp-12', name: 'Harsh Patel', podId: 'pod-beta', weeklyOff: 'Thu' },
    { id: 'emp-13', name: 'Pooja Singh', podId: 'pod-beta', weeklyOff: 'Fri' },
    { id: 'emp-14', name: 'Anand Joshi', podId: 'pod-beta', weeklyOff: 'Sat' },
    { id: 'emp-15', name: 'Maya Sen', podId: 'pod-beta', weeklyOff: 'Sun' },
    { id: 'emp-16', name: 'Sahil Khan', podId: 'pod-beta', weeklyOff: 'Mon' },
    { id: 'emp-17', name: 'Neha Reddy', podId: 'pod-gamma', weeklyOff: 'Tue' },
    { id: 'emp-18', name: 'Ritvik Arora', podId: 'pod-gamma', weeklyOff: 'Wed' },
    { id: 'emp-19', name: 'Tanvi Kapoor', podId: 'pod-gamma', weeklyOff: 'Thu' },
    { id: 'emp-20', name: 'Omar Malik', podId: 'pod-gamma', weeklyOff: 'Fri' },
    { id: 'emp-21', name: 'Kavya Gopal', podId: 'pod-gamma', weeklyOff: 'Sat' },
    { id: 'emp-22', name: 'Arjun Nair', podId: 'pod-gamma', weeklyOff: 'Sun' },
    { id: 'emp-23', name: 'Rhea Bose', podId: 'pod-gamma', weeklyOff: 'Mon' },
    { id: 'emp-24', name: 'Sameer Das', podId: 'pod-gamma', weeklyOff: 'Tue' },
    { id: 'emp-25', name: 'Zaid Ali', podId: 'pod-alpha', weeklyOff: 'Wed' },
    { id: 'emp-26', name: 'Naina Seth', podId: 'pod-beta', weeklyOff: 'Thu' },
    { id: 'emp-27', name: 'Vikram Tiwari', podId: 'pod-gamma', weeklyOff: 'Fri' },
    { id: 'emp-28', name: 'Shreya Malhotra', podId: 'pod-alpha', weeklyOff: 'Sat' },
    { id: 'emp-29', name: 'Kabir Sinha', podId: 'pod-beta', weeklyOff: 'Sun' },
    { id: 'emp-30', name: 'Leah Thomas', podId: 'pod-gamma', weeklyOff: 'Mon' },
    { id: 'emp-31', name: 'Dev Jha', podId: 'pod-alpha', weeklyOff: 'Tue' },
    { id: 'emp-32', name: 'Manas Verma', podId: 'pod-beta', weeklyOff: 'Wed' },
  ];

  const brands = [
    {
      id: 'brand-1',
      name: 'LumaCart',
      podId: 'pod-alpha',
      processRules: {
        cs: { minimumStaff: 2, operatingRule: 'weekday-no-holiday' },
        acc: { minimumStaff: 1, operatingRule: 'all-days' },
        retention: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        ndr: { minimumStaff: 1, operatingRule: 'all-days' },
      },
    },
    {
      id: 'brand-2',
      name: 'VelvetLoop',
      podId: 'pod-beta',
      processRules: {
        cs: { minimumStaff: 2, operatingRule: 'weekday-no-holiday' },
        acc: { minimumStaff: 1, operatingRule: 'all-days' },
        retention: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        ndr: { minimumStaff: 1, operatingRule: 'all-days' },
      },
    },
    {
      id: 'brand-3',
      name: 'Northstar House',
      podId: 'pod-gamma',
      processRules: {
        cs: { minimumStaff: 2, operatingRule: 'weekend-off' },
        acc: { minimumStaff: 1, operatingRule: 'all-days' },
        retention: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        ndr: { minimumStaff: 1, operatingRule: 'weekend-off' },
      },
    },
    {
      id: 'brand-4',
      name: 'Summit Daily',
      podId: 'pod-alpha',
      processRules: {
        cs: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        acc: { minimumStaff: 1, operatingRule: 'all-days' },
        retention: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        ndr: { minimumStaff: 1, operatingRule: 'all-days' },
      },
    },
    {
      id: 'brand-5',
      name: 'Prime Thread',
      podId: 'pod-gamma',
      processRules: {
        cs: { minimumStaff: 2, operatingRule: 'weekday-and-holiday' },
        acc: { minimumStaff: 1, operatingRule: 'all-days' },
        retention: { minimumStaff: 1, operatingRule: 'weekday-no-holiday' },
        ndr: { minimumStaff: 1, operatingRule: 'weekend-off' },
      },
    },
  ];

  const assignments = [
    { employeeId: 'emp-01', brandId: 'brand-1', processId: 'cs' },
    { employeeId: 'emp-02', brandId: 'brand-1', processId: 'acc' },
    { employeeId: 'emp-03', brandId: 'brand-1', processId: 'retention' },
    { employeeId: 'emp-04', brandId: 'brand-1', processId: 'ndr' },
    { employeeId: 'emp-05', brandId: 'brand-2', processId: 'cs' },
    { employeeId: 'emp-06', brandId: 'brand-2', processId: 'acc' },
    { employeeId: 'emp-07', brandId: 'brand-2', processId: 'retention' },
    { employeeId: 'emp-08', brandId: 'brand-2', processId: 'ndr' },
    { employeeId: 'emp-09', brandId: 'brand-3', processId: 'cs' },
    { employeeId: 'emp-10', brandId: 'brand-3', processId: 'acc' },
    { employeeId: 'emp-11', brandId: 'brand-3', processId: 'retention' },
    { employeeId: 'emp-12', brandId: 'brand-3', processId: 'ndr' },
    { employeeId: 'emp-13', brandId: 'brand-4', processId: 'cs' },
    { employeeId: 'emp-14', brandId: 'brand-4', processId: 'acc' },
    { employeeId: 'emp-15', brandId: 'brand-4', processId: 'retention' },
    { employeeId: 'emp-16', brandId: 'brand-4', processId: 'ndr' },
    { employeeId: 'emp-17', brandId: 'brand-5', processId: 'cs' },
    { employeeId: 'emp-18', brandId: 'brand-5', processId: 'acc' },
    { employeeId: 'emp-19', brandId: 'brand-5', processId: 'retention' },
    { employeeId: 'emp-20', brandId: 'brand-5', processId: 'ndr' },
    { employeeId: 'emp-21', brandId: 'brand-1', processId: 'cs' },
    { employeeId: 'emp-22', brandId: 'brand-2', processId: 'cs' },
    { employeeId: 'emp-23', brandId: 'brand-3', processId: 'cs' },
    { employeeId: 'emp-24', brandId: 'brand-4', processId: 'cs' },
    { employeeId: 'emp-25', brandId: 'brand-5', processId: 'cs' },
    { employeeId: 'emp-26', brandId: 'brand-2', processId: 'acc' },
    { employeeId: 'emp-27', brandId: 'brand-4', processId: 'retention' },
    { employeeId: 'emp-28', brandId: 'brand-3', processId: 'retention' },
    { employeeId: 'emp-29', brandId: 'brand-1', processId: 'acc' },
    { employeeId: 'emp-30', brandId: 'brand-5', processId: 'retention' },
    { employeeId: 'emp-31', brandId: 'brand-1', processId: 'ndr' },
    { employeeId: 'emp-32', brandId: 'brand-5', processId: 'acc' },
  ];

  return { pods, employees, brands, processes, assignments, leaveRecords: [] };
}

function getEmployeeById(id) {
  return state.employees.find((employee) => employee.id === id);
}

function showEmployeeStatus(message, type = '') {
  const status = document.getElementById('employeeStatus');
  status.textContent = message;
  status.className = `form-status${type ? ` ${type}` : ''}`;
}

function showDashboardStatus(message, type = '') {
  const status = document.getElementById('dashboardStatus');
  status.textContent = message;
  status.className = `form-status${type ? ` ${type}` : ''}`;
}

function clearGeneratedRoster() {
  state.generatedRoster = null;
  state.generatedCoverageGaps = null;
  state.validationReport = null;
  state.validationStale = false;
}

function showEmployeeUpdateStatus(message, type = '') {
  const status = document.getElementById('employeeUpdateStatus');
  status.textContent = message;
  status.className = `form-status${type ? ` ${type}` : ''}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function getApiError(response) {
  try {
    const body = await response.json();
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
  } catch (error) {
    // Non-JSON error responses use the status text below.
  }
  return `Request failed (${response.status} ${response.statusText}).`;
}

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(await getApiError(response));
  }
  return response.json();
}

function mapApiEmployee(employee) {
  if (!employee || typeof employee.id === 'undefined' ||
      typeof employee.name !== 'string' || typeof employee.pod !== 'string' ||
      typeof employee.weeklyOff !== 'string') {
    throw new Error('The employee API returned an invalid employee record.');
  }

  const podName = employee.pod.trim();
  let pod = state.pods.find((item) => item.name === podName);
  if (!pod) {
    const podId = `api-${podName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    pod = { id: podId, name: podName };
    state.pods.push(pod);
  }

  const weeklyOff = WEEK_DAYS.find(
    (day) => day.short.toLowerCase() === employee.weeklyOff.trim().toLowerCase() ||
      day.full.toLowerCase() === employee.weeklyOff.trim().toLowerCase(),
  );

  return {
    id: String(employee.id),
    name: employee.name,
    podId: pod.id,
    weeklyOff: weeklyOff ? weeklyOff.short : employee.weeklyOff,
    active: employee.active !== false,
  };
}

async function loadDashboardData() {
  const generateButton = document.getElementById('generateBtn');
  const validateButton = document.getElementById('validateBtn');
  const formButtons = [
    document.querySelector('#employeeForm button[type="submit"]'),
    document.querySelector('#brandForm button[type="submit"]'),
    document.querySelector('#processForm button[type="submit"]'),
    document.querySelector('#assignmentForm button[type="submit"]'),
    document.querySelector('#employeeUpdateForm button[type="submit"]'),
  ];
  generateButton.disabled = true;
  validateButton.disabled = true;
  formButtons.forEach((button) => { button.disabled = true; });
  showDashboardStatus('Loading employees, brands, pods, and processes...');

  try {
    const [employees, pods, brands, processes, assignments, rosters] = await Promise.all([
      requestApi('/employees'),
      requestApi('/pods'),
      requestApi('/brands'),
      requestApi('/processes'),
      requestApi('/assignments'),
      requestApi('/rosters'),
    ]);

    if (![employees, pods, brands, processes, assignments, rosters].every(Array.isArray)) {
      throw new Error('The server returned an invalid dashboard response.');
    }

    state.pods = pods.map((pod) => ({
      id: String(pod.id),
      name: pod.name,
    }));
    state.employees = employees.map(mapApiEmployee);
    state.brands = brands.map((brand) => ({
      id: String(brand.id),
      name: brand.name,
      podId: brand.podId ? String(brand.podId) : '',
      processRules: {},
    }));
    state.processes = processes.map((process) => ({
      id: String(process.id),
      name: process.name,
      defaultRule: 'weekday-no-holiday',
      defaultCoverage: 1,
    }));
    state.assignments = assignments;

    const [year, month] = state.month.split('-').map(Number);
    state.generatedRoster = rosters.find(
      (roster) => roster.year === year && roster.month === month,
    ) || null;
    state.generatedCoverageGaps = state.generatedRoster
      ? state.generatedRoster.shifts.filter((shift) => shift.gap > 0)
      : null;
    state.validationReport = null;
    state.validationStale = false;
    refreshAll();
    showDashboardStatus(
      `Loaded ${employees.length} employees, ${brands.length} brands, ${pods.length} pods, and ${processes.length} processes.`,
      'success',
    );
  } catch (error) {
    showDashboardStatus(`Could not load dashboard data: ${error.message}`, 'error');
  } finally {
    generateButton.disabled = false;
    validateButton.disabled = false;
    formButtons.forEach((button) => { button.disabled = false; });
  }
}

function getBrandById(id) {
  return state.brands.find((brand) => brand.id === id);
}

function getProcessById(id) {
  return state.processes.find((process) => process.id === id);
}

function getAssignmentsForBrandProcess(brandId, processId) {
  return state.assignments.filter(
    (assignment) => assignment.brandId === brandId && assignment.processId === processId,
  );
}

function getHolidaysForSelectedMonth() {
  const [year, month] = state.month.split('-').map(Number);
  const monthIndex = month - 1;
  return createHolidaySet(year, monthIndex);
}

function isWorkingDayForRule(dateStr, ruleName) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const holidaySet = state.holidays;

  if (ruleName === 'all-days') {
    return true;
  }

  if (ruleName === 'weekday-no-holiday') {
    return day >= 1 && day <= 5 && !holidaySet.has(dateStr);
  }

  if (ruleName === 'weekday-and-holiday') {
    return day >= 1 && day <= 5 && !holidaySet.has(dateStr);
  }

  if (ruleName === 'weekend-off') {
    return day !== 0 && !holidaySet.has(dateStr);
  }

  return true;
}

function employeeIsAvailable(employeeId, dateStr) {
  const employee = getEmployeeById(employeeId);
  if (!employee || employee.active === false) {
    return false;
  }

  const overrideKey = `${employeeId}|${dateStr}`;
  if (state.manualOverrides[overrideKey] === 'work') {
    return true;
  }
  if (state.manualOverrides[overrideKey] === 'off') {
    return false;
  }

  const weeklyOff = employee.weeklyOff;
  const day = dayNameFromDate(dateStr);

  if (weeklyOff === day) {
    return false;
  }

  if (state.leaveRecords.some(
    (record) => record.employeeId === employeeId && record.date === dateStr,
  )) {
    return false;
  }

  return true;
}

function buildMonthlyCoverage() {
  const [year, month] = state.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const coverageMap = {};

  state.brands.forEach((brand) => {
    const monthBrandMap = {};

    state.processes.forEach((process) => {
      const rule = getProcessRule(brand, process.id);
      const assignments = getAssignmentsForBrandProcess(brand.id, process.id);

      const dayEntries = {};
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month - 1, day);
        const dateStr = toISODate(date);
        const workingDay = isWorkingDayForRule(dateStr, rule.operatingRule);

        if (!workingDay) {
          dayEntries[dateStr] = {
            required: rule.minimumStaff,
            available: [],
            assigned: [],
            status: 'off',
            reason: 'Non-working day for this process rule',
          };
          continue;
        }

        const availableEmployees = assignments
          .filter((assignment) => employeeIsAvailable(assignment.employeeId, dateStr))
          .map((assignment) => assignment.employeeId);

        const assignedEmployees = availableEmployees.slice(0, rule.minimumStaff);
        const shortage = rule.minimumStaff - assignedEmployees.length;

        let status = 'ok';
        let reason = 'Coverage meets requirement';

        if (assignedEmployees.length === 0) {
          status = 'critical';
          reason = 'No employee available for this process';
        } else if (shortage > 0) {
          status = 'risk';
          reason = `${shortage} more employee(s) needed to meet staffing minimum`;
        }

        dayEntries[dateStr] = {
          required: rule.minimumStaff,
          available: availableEmployees,
          assigned: assignedEmployees,
          status,
          reason,
        };
      }

      monthBrandMap[process.id] = dayEntries;
    });

    coverageMap[brand.id] = monthBrandMap;
  });

  return coverageMap;
}

function computeConflicts() {
  const coverageMap = buildMonthlyCoverage();
  const conflicts = [];

  Object.entries(coverageMap).forEach(([brandId, processMap]) => {
    const brand = getBrandById(brandId);
    Object.entries(processMap).forEach(([processId, dayEntries]) => {
      const process = getProcessById(processId);
      Object.entries(dayEntries).forEach(([dateStr, coverage]) => {
        if (coverage.status === 'critical' || coverage.status === 'risk') {
          const backupCandidates = state.employees
            .filter((employee) => {
              const assignedElsewhere = state.assignments.some(
                (assignment) =>
                  assignment.employeeId === employee.id &&
                  assignment.brandId === brandId &&
                  assignment.processId === processId,
              );
              return !assignedElsewhere && employeeIsAvailable(employee.id, dateStr);
            })
            .slice(0, 3)
            .map((employee) => employee.name);
          const recommendation = backupCandidates.length
            ? ` Possible backup: ${backupCandidates.join(', ')}.`
            : ' No available backup employee detected.';

          conflicts.push({
            severity: coverage.status === 'critical' ? 'danger' : 'warning',
            text: `${brand.name} / ${process.name} on ${dateStr}: ${coverage.reason}.${recommendation}`,
          });
        }
      });
    });
  });

  return conflicts;
}

function renderKpis() {
  const totalEmployees = state.employees.length;
  const totalBrands = state.brands.length;
  const totalProcesses = state.processes.length;
  const conflictCount = state.validationStale
    ? '—'
    : state.validationReport
      ? state.validationReport.totalIssues
      : state.generatedCoverageGaps
        ? state.generatedCoverageGaps.length
        : computeConflicts().length;

  const cards = [
    { label: 'Employees', value: totalEmployees },
    { label: 'Brands', value: totalBrands },
    { label: 'Processes', value: totalProcesses },
    { label: 'Open conflicts', value: conflictCount },
  ];

  const container = document.getElementById('kpiRow');
  container.innerHTML = cards
    .map(
      (card) => `
        <div class="kpi">
          <div class="kpi-label">${card.label}</div>
          <div class="kpi-value">${card.value}</div>
        </div>
      `,
    )
    .join('');
}

function renderSelectOptions() {
  const podSelects = [document.getElementById('employeePod'), document.getElementById('brandPod')];
  podSelects.forEach((select) => {
    select.innerHTML = state.pods
      .map((pod) => `<option value="${escapeHtml(pod.id)}">${escapeHtml(pod.name)}</option>`)
      .join('');
  });

  const employeeOptions = state.employees
    .map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)}</option>`)
    .join('');
  document.getElementById('assignmentEmployee').innerHTML = employeeOptions;
  document.getElementById('leaveEmployee').innerHTML = employeeOptions;
  document.getElementById('overrideEmployee').innerHTML = employeeOptions;

  const updateEmployeeSelect = document.getElementById('employeeUpdateSelect');
  const selectedUpdateEmployeeId = updateEmployeeSelect.value;
  updateEmployeeSelect.innerHTML = state.employees
    .map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)}${employee.active === false ? ' · Inactive' : ''}</option>`)
    .join('');
  if (state.employees.some((employee) => employee.id === selectedUpdateEmployeeId)) {
    updateEmployeeSelect.value = selectedUpdateEmployeeId;
  }

  const brandOptions = state.brands
    .map((brand) => `<option value="${escapeHtml(brand.id)}">${escapeHtml(brand.name)}</option>`)
    .join('');
  document.getElementById('assignmentBrand').innerHTML = brandOptions;

  const processOptions = state.processes
    .map((process) => `<option value="${escapeHtml(process.id)}">${escapeHtml(process.name)}</option>`)
    .join('');
  document.getElementById('assignmentProcess').innerHTML = processOptions;

  const filterBrandSelect = document.getElementById('brandFilter');
  filterBrandSelect.innerHTML = `<option value="all">All brands</option>${brandOptions}`;

  const filterPodSelect = document.getElementById('podFilter');
  filterPodSelect.innerHTML = `<option value="all">All pods</option>${state.pods
    .map((pod) => `<option value="${escapeHtml(pod.id)}">${escapeHtml(pod.name)}</option>`)
    .join('')}`;

  const processFilter = document.getElementById('processFilter');
  processFilter.innerHTML = `<option value="all">All processes</option>${processOptions}`;

  const removeAssignmentSelect = document.getElementById('removeAssignment');
  if (removeAssignmentSelect) {
    removeAssignmentSelect.innerHTML = state.assignments
      .map((assignment, index) => {
        const employee = getEmployeeById(assignment.employeeId);
        const brand = getBrandById(assignment.brandId);
        const process = getProcessById(assignment.processId);
        return `<option value="${escapeHtml(assignment.id || index)}">${escapeHtml(employee?.name || 'Unknown')} · ${escapeHtml(brand?.name || 'Unknown')} · ${escapeHtml(process?.name || 'Unknown')}</option>`;
      })
      .join('');
  }
}

function syncEmployeeUpdateFields() {
  const employee = getEmployeeById(document.getElementById('employeeUpdateSelect').value);
  if (!employee) {
    return;
  }

  const weeklyOff = WEEK_DAYS.find(
    (day) => day.short.toLowerCase() === employee.weeklyOff.toLowerCase() ||
      day.full.toLowerCase() === employee.weeklyOff.toLowerCase(),
  );
  document.getElementById('employeeUpdateWeeklyOff').value = weeklyOff?.short || 'Sun';
  document.getElementById('employeeUpdateActive').value =
    employee.active === false ? 'false' : 'true';
}

function renderEmployeeList() {
  const employeeContainer = document.getElementById('employeeList');
  if (employeeContainer) {
    employeeContainer.innerHTML = state.employees
      .map((employee) => `<li>${escapeHtml(employee.name)} · ${escapeHtml(state.pods.find((pod) => pod.id === employee.podId)?.name || '')}</li>`)
      .join('');
  }
}

function renderBrandList() {
  const brandContainer = document.getElementById('brandList');
  if (brandContainer) {
    brandContainer.innerHTML = state.brands
      .map((brand) => `<li>${brand.name}</li>`)
      .join('');
  }
}

function renderGeneratedRoster() {
  const roster = state.generatedRoster;
  const brandFilter = document.getElementById('brandFilter').value;
  const podFilter = document.getElementById('podFilter').value;
  const processFilter = document.getElementById('processFilter').value;
  const shifts = roster.shifts.filter((shift) => {
    const brand = getBrandById(shift.brandId);
    const brandMatches = brandFilter === 'all' || shift.brandId === brandFilter;
    const podMatches = podFilter === 'all' || !brand?.podId || brand.podId === podFilter;
    const processMatches = processFilter === 'all' || shift.processId === processFilter;
    return brandMatches && podMatches && processMatches;
  });
  const shiftsByDate = new Map();
  shifts.forEach((shift) => {
    if (!shiftsByDate.has(shift.date)) {
      shiftsByDate.set(shift.date, []);
    }
    shiftsByDate.get(shift.date).push(shift);
  });

  if (!shifts.length) {
    document.getElementById('rosterGrid').innerHTML =
      '<div class="generated-roster">No generated shifts match the current filters.</div>';
    return;
  }

  const dateSections = Array.from(shiftsByDate.keys()).sort().map((date) => {
    const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const shiftRows = shiftsByDate.get(date).map((shift) => {
      const employeeNames = (shift.employees || [])
        .map((employee) => employee.name)
        .filter(Boolean);
      const displayedEmployees = employeeNames.length
        ? employeeNames.join(', ')
        : (shift.employeeIds || []).join(', ') || 'No employees assigned';
      const hasGap = shift.gap > 0;
      const staffingLabel = `${shift.assignedStaff}/${shift.requiredStaff} staff${hasGap ? ` · ${shift.gap} gap` : ''}`;

      return `
        <div class="roster-shift">
          <strong>${escapeHtml(shift.brandName || shift.brandId)}</strong>
          <span>${escapeHtml(shift.processName || shift.processId)}</span>
          <span>${escapeHtml(displayedEmployees)}</span>
          <span class="roster-shift-status${hasGap ? ' gap' : ''}">${escapeHtml(staffingLabel)}</span>
        </div>
      `;
    }).join('');

    return `
      <section class="roster-date">
        <h4>${escapeHtml(dateLabel)} · ${escapeHtml(date)}</h4>
        ${shiftRows}
      </section>
    `;
  }).join('');

  document.getElementById('rosterGrid').innerHTML =
    `<div class="generated-roster">${dateSections}</div>`;
}

function updateRoster() {
  const [year, month] = state.month.split('-').map(Number);
  if (state.generatedRoster &&
      state.generatedRoster.year === year &&
      state.generatedRoster.month === month) {
    renderGeneratedRoster();
    return;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const coverageMap = buildMonthlyCoverage();

  const viewMode = document.getElementById('viewMode')?.value || 'company';

  const brandFilter = document.getElementById('brandFilter').value;
  const podFilter = document.getElementById('podFilter').value;
  const processFilter = document.getElementById('processFilter').value;

  if (viewMode === 'employee') {
    const visibleEmployees = state.employees.filter((employee) => {
      if (podFilter !== 'all' && employee.podId !== podFilter) {
        return false;
      }
      return true;
    });

    const rows = visibleEmployees.map((employee) => {
      const cells = [];
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = toISODate(new Date(year, month - 1, day));
        let status = 'status-off';
        let label = 'Off';
        if (employeeIsAvailable(employee.id, dateStr)) {
          const assignments = state.assignments.filter(
            (assignment) => assignment.employeeId === employee.id,
          );
          status = assignments.length ? 'status-ok' : 'status-off';
          label = assignments.length ? 'Work' : 'Unassigned';
        } else {
          const leave = state.leaveRecords.find(
            (record) => record.employeeId === employee.id && record.date === dateStr,
          );
          label = leave?.type === 'comp-off' ? 'Comp-off' : leave?.type || 'Weekly off';
        }
        cells.push(`<td><div class="day-cell ${status}" title="${label}">${label}</div></td>`);
      }
      const pod = state.pods.find((item) => item.id === employee.podId);
      return `<tr><td class="row-label">${escapeHtml(employee.name)}<br><small>${escapeHtml(pod?.name || '')}</small></td>${cells.join('')}</tr>`;
    });

    const headerCells = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      return `<th>${dayNames[date.getDay()]} ${index + 1}</th>`;
    });

    document.getElementById('rosterGrid').innerHTML = `
      <table class="roster-table">
        <thead><tr><th>Employee</th>${headerCells.join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
    return;
  }

  const visibleBrands = state.brands.filter((brand) => {
    const brandMatch = brandFilter === 'all' || brand.id === brandFilter;
    const podMatch = podFilter === 'all' || !brand.podId || brand.podId === podFilter;
    return brandMatch && podMatch;
  });

  const rows = [];
  visibleBrands.forEach((brand) => {
    const processesToRender = state.processes.filter((process) => {
      if (processFilter !== 'all' && process.id !== processFilter) {
        return false;
      }
      return Boolean(coverageMap[brand.id]?.[process.id]);
    });

    processesToRender.forEach((process) => {
      const cells = [];
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month - 1, day);
        const dateStr = toISODate(date);
        const dayEntry = coverageMap[brand.id][process.id][dateStr];
        const cellClass = dayEntry ? `status-${dayEntry.status}` : 'status-off';
        const employeeNames = dayEntry.assigned
          .map((employeeId) => getEmployeeById(employeeId)?.name || 'Unassigned')
          .join(', ');
        cells.push(
          `<td><div class="day-cell ${cellClass}" title="${escapeHtml(`${dateStr}: ${dayEntry.reason} — ${employeeNames || 'No assigned staff'}`)}">${dayEntry.assigned.length}/${dayEntry.required}</div></td>`,
        );
      }
      rows.push(`
        <tr>
          <td class="row-label">${brand.name} / ${process.name}</td>
          ${cells.join('')}
        </tr>
      `);
    });
  });

  const headerCells = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const label = `${dayNames[date.getDay()]} ${day}`;
    headerCells.push(`<th>${label}</th>`);
  }

  const html = `
    <table class="roster-table">
      <thead>
        <tr>
          <th>Brand / Process</th>
          ${headerCells.join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.join('') || '<tr><td colspan="32">No roster rows match the current filters.</td></tr>'}
      </tbody>
    </table>
  `;

  document.getElementById('rosterGrid').innerHTML = html;
}

function renderConflictList() {
  const list = document.getElementById('conflictList');

  if (state.validationReport) {
    const report = state.validationReport;
    const summaryClass = report.isValid ? 'ok' : 'danger';
    const summary = `
      <li class="${summaryClass}">
        Validation for ${escapeHtml(`${report.year}-${padNumber(report.month)}`)}:
        ${report.totalIssues} issue(s) — ${report.summary.critical} critical,
        ${report.summary.error} errors, ${report.summary.warning} warnings.
      </li>
    `;
    const issues = report.issues.slice(0, 100).map((issue) => {
      const context = [
        issue.date,
        issue.brandName || issue.brandId,
        issue.processName || issue.processId,
      ].filter(Boolean).join(' · ');
      const details = Object.keys(issue.details || {}).length
        ? ` ${JSON.stringify(issue.details)}`
        : '';
      const issueClass = issue.severity === 'critical' || issue.severity === 'error'
        ? 'danger'
        : 'warning';
      return `<li class="${issueClass}"><strong>${escapeHtml(issue.type)}</strong> · ${escapeHtml(context)}<br>${escapeHtml(issue.message)}${escapeHtml(details)}</li>`;
    }).join('');

    list.innerHTML = summary + (issues || '<li class="ok">No validation issues found.</li>');
    return;
  }

  if (state.validationStale) {
    list.innerHTML = '<li class="warning">Employee data changed since validation. Select “Revalidate roster” to check for new gaps and conflicts.</li>';
    return;
  }

  if (state.generatedCoverageGaps) {
    if (!state.generatedCoverageGaps.length) {
      list.innerHTML = '<li class="ok">Generated roster has no staffing gaps.</li>';
      return;
    }

    list.innerHTML = `
      <li class="warning">Generated roster has ${state.generatedCoverageGaps.length} staffing gap(s).</li>
      ${state.generatedCoverageGaps.slice(0, 100).map((shift) => `
        <li class="danger">${escapeHtml(shift.date)} · ${escapeHtml(shift.brandName || shift.brandId)} /
        ${escapeHtml(shift.processName || shift.processId)} · ${shift.assignedStaff}/${shift.requiredStaff} staff,
        gap ${shift.gap}</li>
      `).join('')}
    `;
    return;
  }

  const conflicts = computeConflicts();

  if (!conflicts.length) {
    list.innerHTML = '<li class="ok">No conflicts detected for the selected month.</li>';
    return;
  }

  list.innerHTML = conflicts
    .slice(0, 8)
    .map(
      (conflict) => `
        <li class="${conflict.severity === 'danger' ? 'danger' : 'warning'}">${escapeHtml(conflict.text)}</li>
      `,
    )
    .join('');
}

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderWorkloadList() {
  const list = document.getElementById('workloadList');
  const [year, month] = state.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const workload = state.employees.map((employee) => {
    let totalDays = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = toISODate(new Date(year, month - 1, day));
      const count = state.assignments.filter(
        (assignment) => assignment.employeeId === employee.id && employeeIsAvailable(employee.id, dateStr),
      ).length;
      totalDays += count;
    }
    return { employee, totalDays };
  }).sort((a, b) => b.totalDays - a.totalDays);

  list.innerHTML = workload
    .slice(0, 8)
    .map((entry) => `<li>${escapeHtml(entry.employee.name)} · ${entry.totalDays} active days</li>`)
    .join('');
}

function exportRosterCsv() {
  const [rosterYear, rosterMonth] = state.month.split('-').map(Number);
  if (state.generatedRoster &&
      state.generatedRoster.year === rosterYear &&
      state.generatedRoster.month === rosterMonth) {
    const rosterRows = [[
      'Date',
      'Brand',
      'Process',
      'Required',
      'Assigned',
      'Employees',
      'Status',
    ]];
    state.generatedRoster.shifts.forEach((shift) => {
      rosterRows.push([
        shift.date,
        shift.brandName || shift.brandId,
        shift.processName || shift.processId,
        shift.requiredStaff,
        shift.assignedStaff,
        (shift.employees || []).map((employee) => employee.name).join(' | '),
        shift.status,
      ]);
    });
    downloadCsv(rosterRows, `smart-roster-${state.month}.csv`);
    return;
  }

  const coverageMap = buildMonthlyCoverage();
  const [year, month] = state.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = [['Month', 'Brand', 'Process', 'Date', 'Status', 'Required', 'Assigned', 'Available']];

  state.brands.forEach((brand) => {
    state.processes.forEach((process) => {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = toISODate(new Date(year, month - 1, day));
        const entry = coverageMap[brand.id]?.[process.id]?.[dateStr];
        if (!entry) {
          continue;
        }
        const assignedNames = entry.assigned
          .map((employeeId) => getEmployeeById(employeeId)?.name || 'Unassigned')
          .join(' | ');
        const availableNames = entry.available
          .map((employeeId) => getEmployeeById(employeeId)?.name || 'Unknown')
          .join(' | ');
        rows.push([
          state.month,
          brand.name,
          process.name,
          dateStr,
          entry.status,
          entry.required,
          assignedNames,
          availableNames,
        ]);
      }
    });
  });

  downloadCsv(rows, `smart-roster-${state.month}.csv`);
}

function attachFormHandlers() {
  document.getElementById('employeeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('employeeName').value.trim();
    const podId = document.getElementById('employeePod').value;
    const weeklyOff = document.getElementById('employeeWeeklyOff').value;
    const pod = state.pods.find((item) => item.id === podId);

    if (!name || !pod) {
      showEmployeeStatus('Enter an employee name and choose a pod.', 'error');
      return;
    }

    const submitButton = document.querySelector('#employeeForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    showEmployeeStatus('Saving employee...');

    try {
      const employeeData = await requestApi('/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          pod: pod.name,
          weeklyOff: WEEK_DAYS.find((day) => day.short === weeklyOff)?.full || weeklyOff,
        }),
      });

      const employee = mapApiEmployee(employeeData);
      state.employees.push(employee);
      clearGeneratedRoster();
      document.getElementById('employeeForm').reset();
      saveState();
      refreshAll();
      showEmployeeStatus(`${employee.name} was added successfully.`, 'success');
    } catch (error) {
      showEmployeeStatus(`Could not add employee: ${error.message}`, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add employee';
    }
  });

  document.getElementById('employeeUpdateSelect').addEventListener('change', syncEmployeeUpdateFields);

  document.getElementById('employeeUpdateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const employeeId = document.getElementById('employeeUpdateSelect').value;
    const employee = getEmployeeById(employeeId);
    const pod = state.pods.find((item) => item.id === employee?.podId);
    if (!employee || !pod) {
      showEmployeeUpdateStatus('Choose an employee with a valid pod.', 'error');
      return;
    }

    const weeklyOff = WEEK_DAYS.find(
      (day) => day.short === document.getElementById('employeeUpdateWeeklyOff').value,
    );
    const active = document.getElementById('employeeUpdateActive').value === 'true';
    const submitButton = document.querySelector('#employeeUpdateForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    showEmployeeUpdateStatus('Saving employee changes...');

    try {
      const updatedData = await requestApi(`/employees/${encodeURIComponent(employeeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: employee.name,
          pod: pod.name,
          weeklyOff: weeklyOff.full,
          active,
        }),
      });
      const updatedEmployee = mapApiEmployee(updatedData);
      const employeeIndex = state.employees.findIndex((item) => item.id === employeeId);
      state.employees[employeeIndex] = updatedEmployee;
      state.validationReport = null;
      state.validationStale = Boolean(state.generatedRoster);
      saveState();
      refreshAll();
      const nextAction = state.generatedRoster
        ? 'Click Revalidate roster to check for new gaps and conflicts.'
        : 'Generate a roster to see the effect of this change.';
      showEmployeeUpdateStatus(`${updatedEmployee.name} updated. ${nextAction}`, 'success');
    } catch (error) {
      showEmployeeUpdateStatus(`Could not update employee: ${error.message}`, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Update employee';
    }
  });

  document.getElementById('brandForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('brandName').value.trim();
    const podId = document.getElementById('brandPod').value;

    if (!name) {
      return;
    }

    const submitButton = document.querySelector('#brandForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    try {
      const brandData = await requestApi('/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const processRules = {};
      state.processes.forEach((process) => {
        processRules[process.id] = {
          minimumStaff: process.defaultCoverage,
          operatingRule: process.defaultRule,
        };
      });
      state.brands.push({ ...brandData, podId, processRules });
      clearGeneratedRoster();
      document.getElementById('brandForm').reset();
      saveState();
      refreshAll();
      showDashboardStatus(`${brandData.name} was added successfully.`, 'success');
    } catch (error) {
      showDashboardStatus(`Could not add brand: ${error.message}`, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add brand';
    }
  });

  document.getElementById('processForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('processName').value.trim();
    const operatingRule = document.getElementById('processRule').value;
    const minimumStaff = Number(document.getElementById('processCoverage').value) || 1;

    if (!name) {
      return;
    }

    const submitButton = document.querySelector('#processForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    try {
      const processData = await requestApi('/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const process = {
        ...processData,
        defaultRule: operatingRule,
        defaultCoverage: minimumStaff,
      };

      state.processes.push(process);
      state.brands.forEach((brand) => {
        brand.processRules[process.id] = {
          minimumStaff,
          operatingRule,
        };
      });

      clearGeneratedRoster();
      document.getElementById('processForm').reset();
      saveState();
      refreshAll();
      showDashboardStatus(`${process.name} was added successfully.`, 'success');
    } catch (error) {
      showDashboardStatus(`Could not add process: ${error.message}`, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add process';
    }
  });

  document.getElementById('assignmentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const employeeId = document.getElementById('assignmentEmployee').value;
    const brandId = document.getElementById('assignmentBrand').value;
    const processId = document.getElementById('assignmentProcess').value;

    const submitButton = document.querySelector('#assignmentForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    try {
      await requestApi('/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, brandId, processId }),
      });
      state.assignments = await requestApi('/assignments');
      clearGeneratedRoster();
      saveState();
      refreshAll();
      showDashboardStatus('Assignment saved successfully.', 'success');
    } catch (error) {
      showDashboardStatus(`Could not save assignment: ${error.message}`, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Assign';
    }
  });

  document.getElementById('removeAssignmentBtn').addEventListener('click', async () => {
    const assignmentId = document.getElementById('removeAssignment').value;
    const assignment = state.assignments.find((item) => item.id === assignmentId);
    if (assignment) {
      const removeButton = document.getElementById('removeAssignmentBtn');
      removeButton.disabled = true;
      removeButton.textContent = 'Removing...';
      try {
        await requestApi(`/assignments/${encodeURIComponent(assignment.id)}`, {
          method: 'DELETE',
        });
        state.assignments = await requestApi('/assignments');
        clearGeneratedRoster();
        saveState();
        refreshAll();
        showDashboardStatus('Assignment removed successfully.', 'success');
      } catch (error) {
        showDashboardStatus(`Could not remove assignment: ${error.message}`, 'error');
      } finally {
        removeButton.disabled = false;
        removeButton.textContent = 'Remove assignment';
      }
    } else {
      const index = Number(assignmentId);
      if (Number.isInteger(index)) {
        state.assignments.splice(index, 1);
        saveState();
        refreshAll();
      }
    }
  });

  document.getElementById('leaveForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const employeeId = document.getElementById('leaveEmployee').value;
    const date = document.getElementById('leaveDate').value;
    const type = document.getElementById('leaveType').value;

    if (!date) {
      return;
    }

    state.leaveRecords = state.leaveRecords.filter(
      (record) => !(record.employeeId === employeeId && record.date === date),
    );

    state.leaveRecords.push({ employeeId, date, type });
    document.getElementById('leaveForm').reset();
    saveState();
    refreshAll();
  });

  document.getElementById('holidayForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const date = document.getElementById('holidayDate').value;
    const name = document.getElementById('holidayName').value.trim();
    if (!date) {
      return;
    }
    state.publicHolidays[date] = name || 'Public holiday';
    document.getElementById('holidayForm').reset();
    saveState();
    refreshAll();
  });

  document.getElementById('overrideForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const employeeId = document.getElementById('overrideEmployee').value;
    const date = document.getElementById('overrideDate').value;
    const status = document.getElementById('overrideStatus').value;
    if (!date) {
      return;
    }
    const key = `${employeeId}|${date}`;
    if (status === 'clear') {
      delete state.manualOverrides[key];
    } else {
      state.manualOverrides[key] = status;
    }
    document.getElementById('overrideForm').reset();
    saveState();
    refreshAll();
  });

  document.getElementById('monthPicker').addEventListener('change', (event) => {
    state.month = event.target.value;
    const [year, month] = state.month.split('-').map(Number);
    if (!state.generatedRoster ||
        state.generatedRoster.year !== year ||
        state.generatedRoster.month !== month) {
      clearGeneratedRoster();
    }
    saveState();
    refreshAll();
  });

  document.getElementById('generateBtn').addEventListener('click', async () => {
    const [year, month] = document.getElementById('monthPicker').value.split('-').map(Number);
    if (!month || !year) {
      showDashboardStatus('Choose a month before generating the roster.', 'error');
      return;
    }

    const button = document.getElementById('generateBtn');
    button.disabled = true;
    button.textContent = 'Generating...';
    showDashboardStatus('Generating roster from the server...');
    try {
      const result = await requestApi('/rosters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (!result.roster || !Array.isArray(result.roster.shifts)) {
        throw new Error('The server returned an invalid roster.');
      }

      state.generatedRoster = result.roster;
      state.generatedCoverageGaps = Array.isArray(result.coverageGaps)
        ? result.coverageGaps
        : [];
      state.validationReport = null;
      state.validationStale = false;
      state.month = `${year}-${padNumber(month)}`;
      saveState();
      refreshAll();
      showDashboardStatus(
        `Generated ${result.roster.shifts.length} shifts for ${state.month}; ${state.generatedCoverageGaps.length} staffing gap(s).`,
        'success',
      );
    } catch (error) {
      showDashboardStatus(`Could not generate roster: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Generate roster';
    }
  });

  document.getElementById('validateBtn').addEventListener('click', async () => {
    const button = document.getElementById('validateBtn');
    button.disabled = true;
    button.textContent = 'Validating...';
    showDashboardStatus('Validating the latest generated roster...');
    try {
      const report = await requestApi('/rosters/validate', { method: 'POST' });
      state.validationReport = report;
      state.generatedCoverageGaps = null;
      state.validationStale = false;
      renderKpis();
      renderConflictList();
      showDashboardStatus(
        report.isValid
          ? 'Roster validation passed with no issues.'
          : `Validation found ${report.totalIssues} issue(s), including ${report.summary.critical} critical.`,
        report.isValid ? 'success' : 'error',
      );
    } catch (error) {
      showDashboardStatus(`Could not validate roster: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Revalidate roster';
    }
  });

  document.getElementById('brandFilter').addEventListener('change', updateRoster);
  document.getElementById('podFilter').addEventListener('change', updateRoster);
  document.getElementById('processFilter').addEventListener('change', updateRoster);
  document.getElementById('viewMode').addEventListener('change', () => {
    const viewMode = document.getElementById('viewMode').value;
    if (viewMode === 'pod') {
      document.getElementById('podFilter').value = 'all';
    } else if (viewMode === 'brand') {
      document.getElementById('brandFilter').value = 'all';
    } else if (viewMode === 'process') {
      document.getElementById('processFilter').value = 'all';
    }
    refreshAll();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    const data = buildSampleData();
    state.employees = data.employees;
    state.pods = data.pods;
    state.brands = data.brands;
    state.processes = data.processes;
    state.assignments = data.assignments;
    state.leaveRecords = [];
    state.publicHolidays = {};
    state.manualOverrides = {};
    state.month = getCurrentMonthString();
    clearGeneratedRoster();
    refreshAll();
    loadDashboardData();
  });

  document.getElementById('exportBtn').addEventListener('click', exportRosterCsv);
}

function refreshAll() {
  state.holidays = getHolidaysForSelectedMonth();
  document.getElementById('monthPicker').value = state.month;
  renderSelectOptions();
  syncEmployeeUpdateFields();
  renderKpis();
  updateRoster();
  renderConflictList();
  renderWorkloadList();
}

function init() {
  const data = buildSampleData();
  const saved = loadState();
  state.pods = saved?.pods || data.pods;
  state.employees = saved?.employees || data.employees;
  state.brands = saved?.brands || data.brands;
  state.processes = saved?.processes || data.processes;
  state.assignments = saved?.assignments || data.assignments;
  state.leaveRecords = saved?.leaveRecords || data.leaveRecords;
  state.publicHolidays = saved?.publicHolidays || {};
  state.manualOverrides = saved?.manualOverrides || {};
  state.month = saved?.month || data.month || getCurrentMonthString();
  state.holidays = getHolidaysForSelectedMonth();

  document.getElementById('monthPicker').value = state.month;
  attachFormHandlers();
  refreshAll();
  loadDashboardData();
}

init();
