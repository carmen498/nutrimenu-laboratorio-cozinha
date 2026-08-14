const STORAGE_KEY = "manter_logado_prefs";

const readPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const getManterLogadoPref = (email) => {
  if (!email) return false;
  const prefs = readPrefs();
  return prefs[email.trim().toLowerCase()] === true;
};

export const setManterLogadoPref = (email, value) => {
  if (!email) return;
  const prefs = readPrefs();
  prefs[email.trim().toLowerCase()] = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors (e.g. private mode)
  }
};