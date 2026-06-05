const BACKEND_URL = 'http://localhost:3000/api';

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
const suggestionsEl = document.getElementById('suggestions');

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
    // keep status visible until replaced by next state
  }
}

// Search for partial matches and render suggestions; if a single exact match exists, show it
async function searchGuest() {
  const raw = searchInput.value || '';
  const query = normalizeName(raw);
  if (!query) {
    showStatus('Please enter a guest name.', 'warning');
    resultCard.classList.add('hidden');
    clearSuggestions();
    return;
  }

  setLoading(true);
  clearSuggestions();

  try {
    const response = await fetch(`${BACKEND_URL}/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to connect to backend.');

    const data = await response.json();
    if (!data || typeof data.success !== 'boolean') throw new Error('Invalid backend response.');

    const results = data.results || [];
    if (results.length === 0) {
      currentGuest = null;
      showResult({ found: false });
      showStatus('No guests found. Try a different name or check spelling.', 'warning');
    } else if (results.length === 1) {
      // single result — show details
      const g = results[0];
      currentGuest = g;
      showResult({ found: true, name: g.name, numberOfGuests: g.numberOfGuests, checkedIn: g.checkedIn });
      showStatus('Guest found. Review details and check them in if ready.', 'success');
    } else {
      // multiple partial matches — show suggestion list
      renderSuggestions(results);
      showStatus(`Found ${results.length} matching guests. Click a name to select.`, 'success');
    }
  } catch (error) {
    resultCard.classList.add('hidden');
    showStatus(error.message || 'Unexpected error. Try again.', 'warning');
  } finally {
    setLoading(false);
  }
}

function renderSuggestions(list) {
  clearSuggestions();
  if (!Array.isArray(list) || list.length === 0) return;
  suggestionsEl.classList.remove('hidden');
  list.forEach((g) => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.setAttribute('role', 'option');
    li.innerHTML = `<span class="s-name">${escapeHtml(g.name)}</span><span class="s-count">${g.numberOfGuests}</span>`;
    li.addEventListener('click', () => {
      currentGuest = g;
      searchInput.value = g.name;
      clearSuggestions();
      showResult({ found: true, name: g.name, numberOfGuests: g.numberOfGuests, checkedIn: g.checkedIn });
      showStatus('Guest selected. Review details and check them in if ready.', 'success');
    });
    suggestionsEl.appendChild(li);
  });
}

function clearSuggestions() {
  suggestionsEl.innerHTML = '';
  suggestionsEl.classList.add('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function checkInGuest() {
  if (!currentGuest || !currentGuest.name) {
    showStatus('No guest selected for check-in.', 'warning');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/checkin`, {
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
