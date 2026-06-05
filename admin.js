const BACKEND_URL = 'http://localhost:3000/api';

const adminSearchInput = document.getElementById('adminSearchInput');
const adminSearchButton = document.getElementById('adminSearchButton');
const refreshButton = document.getElementById('refreshButton');
const exportButton = document.getElementById('exportButton');
const adminStatus = document.getElementById('adminStatus');
const totalGuests = document.getElementById('totalGuests');
const checkedInGuests = document.getElementById('checkedInGuests');
const remainingGuests = document.getElementById('remainingGuests');
const checkInPercent = document.getElementById('checkInPercent');
const guestTableBody = document.querySelector('#guestTable tbody');

let allGuests = [];
let debounceTimer = null;

function normalizeName(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function showStatus(message, type = 'warning') {
  adminStatus.textContent = message;
  adminStatus.className = `status-card ${type}`;
  adminStatus.classList.remove('hidden');
}

function hideStatus() {
  adminStatus.classList.add('hidden');
}

function renderMetrics(guestList) {
  const total = guestList.length;
  const checked = guestList.filter((guest) => guest.checkedIn).length;
  const remaining = total - checked;
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  totalGuests.textContent = total;
  checkedInGuests.textContent = checked;
  remainingGuests.textContent = remaining;
  checkInPercent.textContent = `${percent}%`;
}

function renderTable(guestList) {
  guestTableBody.innerHTML = '';

  if (guestList.length === 0) {
    guestTableBody.innerHTML = '<tr><td colspan="4">No guests found.</td></tr>';
    return;
  }

  guestList.forEach((guest) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const guestsCell = document.createElement('td');
    const checkedInCell = document.createElement('td');
    const timeCell = document.createElement('td');

    nameCell.textContent = guest.name;
    guestsCell.textContent = guest.numberOfGuests;
    checkedInCell.textContent = guest.checkedIn ? 'Yes' : 'No';
    timeCell.textContent = guest.checkInTime || '-';

    nameCell.setAttribute('data-label', 'Name');
    guestsCell.setAttribute('data-label', 'Guests');
    checkedInCell.setAttribute('data-label', 'Checked In');
    timeCell.setAttribute('data-label', 'Check-In Time');

    row.append(nameCell, guestsCell, checkedInCell, timeCell);
    guestTableBody.appendChild(row);
  });
}

async function fetchGuestList() {
  hideStatus();
  try {
    const response = await fetch(`${BACKEND_URL}/admin`);
    if (!response.ok) throw new Error('Unable to contact backend.');
    const data = await response.json();
    if (!data || !data.success) throw new Error('Invalid backend response.');

    allGuests = data.guests || [];
    renderMetrics(allGuests);
    renderTable(allGuests);
  } catch (error) {
    showStatus(error.message || 'Unable to load admin data.', 'warning');
  }
}

function filterGuestList() {
  const query = normalizeName(adminSearchInput.value);
  if (!query) {
    renderMetrics(allGuests);
    renderTable(allGuests);
    return;
  }

  const filtered = allGuests.filter((guest) => normalizeName(guest.name).includes(query));
  renderMetrics(filtered);
  renderTable(filtered);
  if (filtered.length === 0) {
    showStatus('No matching guests were found for this search.', 'warning');
  } else {
    hideStatus();
  }
}

function scheduleAdminSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterGuestList, 500);
}

function exportCsv() {
  if (allGuests.length === 0) {
    showStatus('No guest rows available to export.', 'warning');
    return;
  }

  const header = ['Guest Name', 'Number Of Guests', 'Checked In', 'Check-In Time'];
  const rows = allGuests.map((guest) => [guest.name, guest.numberOfGuests, guest.checkedIn ? 'Yes' : 'No', guest.checkInTime || '']);
  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'guest_list.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

adminSearchInput.addEventListener('input', scheduleAdminSearch);
adminSearchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(debounceTimer);
    filterGuestList();
  }
});
adminSearchButton.addEventListener('click', filterGuestList);
refreshButton.addEventListener('click', fetchGuestList);
exportButton.addEventListener('click', exportCsv);

fetchGuestList();
