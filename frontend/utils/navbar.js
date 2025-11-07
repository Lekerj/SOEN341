// Shared navbar helper for role/status-aware visibility
// Responsibilities:
// - Show admin dropdown if role === 'admin'
// - Show organizer dropdown ONLY if role === 'organizer' AND organizer_auth_status === 'approved'
// - Show a single "Become Organizer" link when role === 'organizer' and status is null/pending/refused
// - Toggle auth links (login/register) vs user links (welcome/logout)
// - Provide a guard for organizer-only pages

import { getApiBase } from './api.js';

async function fetchProfile() {
  try {
    const res = await fetch(`${getApiBase()}/api/auth/profile`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

async function fetchOrganizerStatus() {
  try {
    const res = await fetch(`${getApiBase()}/api/organizer/status`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function setDisplay(el, show) {
  if (!el) return;
  el.style.display = show ? '' : 'none';
}

function setOrganizerRequestLabel(linkEl, authStatus) {
  if (!linkEl) return;
  const a = linkEl.querySelector('a');
  if (!a) return;
  const status = String(authStatus || 'null');
  if (status === 'pending') a.textContent = '⏳ Organizer Request Pending';
  else if (status === 'refused') a.textContent = '❗ Resubmit Organizer Request';
  else a.textContent = '🎯 Become Organizer';
}

export async function setupNavbar() {
  const adminMenu = document.getElementById('adminMenu');
  const organizerMenu = document.getElementById('organizerMenu');
  const organizerRequestLink = document.getElementById('organizerRequestLink');
  const authLinks = document.getElementById('authLinks');
  const userLinks = document.getElementById('userLinks');
  const welcomeMessage = document.getElementById('welcomeMessage');

  // Default: hide role menus
  setDisplay(adminMenu, false);
  setDisplay(organizerMenu, false);
  setDisplay(organizerRequestLink, false);

  // Auth UI defaults
  setDisplay(authLinks, true);
  setDisplay(userLinks, false);

  const user = await fetchProfile();
  if (!user) {
    return; // not logged in
  }

  // Logged-in UI
  setDisplay(authLinks, false);
  setDisplay(userLinks, true);
  if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${user.name || user.email || 'User'}!`;

  // Admin menu
  if (String(user.role || '').toLowerCase() === 'admin') {
    setDisplay(adminMenu, true);
  }

  // Organizer logic
  if (String(user.role || '').toLowerCase() === 'organizer') {
    const status = await fetchOrganizerStatus();
    const authStatus = status?.organizer_auth_status || 'null';
    const isApproved = authStatus === 'approved';

    setDisplay(organizerMenu, isApproved);
    setDisplay(organizerRequestLink, !isApproved);
    if (!isApproved) setOrganizerRequestLabel(organizerRequestLink, authStatus);
  }

  // Wire logout button if present
  const logoutBtn = document.querySelector('#userLinks button, #logoutButton');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${getApiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch {}
      localStorage.removeItem('user');
      window.location.reload();
    });
  }
}

// Use on organizer-only pages to prevent access when not approved
export async function guardApprovedOrganizer() {
  const user = await fetchProfile();
  if (!user || String(user.role || '').toLowerCase() !== 'organizer') {
    // not an organizer, send to home
    window.location.href = 'index.html';
    return;
  }

  const status = await fetchOrganizerStatus();
  const authStatus = status?.organizer_auth_status || 'null';
  if (authStatus !== 'approved') {
    window.location.href = 'organizer-request.html';
  }
}
