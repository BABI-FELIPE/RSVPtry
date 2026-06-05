const BACKEND_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const statusCard = document.getElementById('statusCard');
const resultCard = document.getElementById('resultCard');
const resultLabel = document.getElementById('resultLabel');
const guestName = document.getElementById('guestName');
const guestCount = document.getElementById('guestCount');
const guestStatus = document.getElementById('guestStatus');
const checkInButton = document.getElementById('checkInButton');

let currentGuest = null;
let debounceTimer = null;

function normalizeName(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function showStatus(message, type = 'warning') {
  statusCard.textContent = message;
  statusCard.className = `status-card ${type}`;
  statusCard.classList.remove('hidden');
}

function hideStatus() {
  statusCard.classList.add('hidden');
}

function showResult(guest) {
  if (!guest) {
    resultCard.classList.add('hidden');
    return;
  }

  resultLabel.textContent = guest.found ? 'Guest Found' : 'Guest Not Found';
  guestName.textContent = guest.name || '—';
  guestCount.textContent = guest.numberOfGuests ?? '—';
  guestStatus.textContent = guest.checkedIn ? 'Already Checked In' : 'Not Checked In';

  if (guest.found && !guest.checkedIn) {
    checkInButton.classList.remove('hidden');
  } else {
    checkInButton.classList.add('hidden');
  }

  resultCard.classList.remove('hidden');
}

function setLoading(isLoading) {
  if (isLoading) {
    showStatus('Searching guest, please wait…', 'success');
    resultCard.classList.add('hidden');
    checkInButton.classList.add('hidden');
  } else {
  }
}

async function searchGuest() {
  const query = normalizeName(searchInput.value);
  if (!query) {
    showStatus('Please enter a guest name.', 'warning');
    resultCard.classList.add('hidden');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}?name=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to connect to backend.');

    const data = await response.json();
    if (!data || typeof data.success !== 'boolean') throw new Error('Invalid backend response.');

    if (data.found) {
      currentGuest = data;
      showResult({
        found: true,
        name: data.name,
        numberOfGuests: data.numberOfGuests,
        checkedIn: data.checkedIn,
      });
      showStatus('Guest found. Review details and check them in if ready.', 'success');
    } else {
      currentGuest = null;
      showResult({ found: false });
      showStatus('Guest not found. Please verify the spelling or search a different name.', 'warning');
    }
  } catch (error) {
    resultCard.classList.add('hidden');
    showStatus(error.message || 'Unexpected error. Try again.', 'warning');
  } finally {
    setLoading(false);
  }
}

async function checkInGuest() {
  if (!currentGuest || !currentGuest.name) {
    showStatus('No guest selected for check-in.', 'warning');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: currentGuest.name }),
    });

    if (!response.ok) throw new Error('Failed to connect to backend.');

    const data = await response.json();
    if (!data || typeof data.success !== 'boolean') throw new Error('Invalid backend response.');

    if (data.success) {
      showStatus(data.message, 'success');
      await searchGuest();
    } else {
      showStatus(data.message, 'warning');
    }
  } catch (error) {
    showStatus(error.message || 'Unexpected error. Try again.', 'warning');
  } finally {
    setLoading(false);
  }
}

function scheduleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchGuest();
  }, 500);
}

searchInput.addEventListener('input', scheduleSearch);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(debounceTimer);
    searchGuest();
  }
});
searchButton.addEventListener('click', searchGuest);
checkInButton.addEventListener('click', checkInGuest);
