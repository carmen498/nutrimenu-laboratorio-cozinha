const isNode = typeof window === 'undefined';
const memoryStorage = new Map();
const storage = isNode
	? {
		getItem: (key) => memoryStorage.get(key) ?? null,
		setItem: (key, value) => memoryStorage.set(key, String(value)),
		removeItem: (key) => memoryStorage.delete(key),
	}
	: window.localStorage;
const sessionStorageSeguro = isNode ? storage : window.sessionStorage;

const getAccessToken = () => {
	if (isNode) return null;

	const chave = 'base44_access_token';
	const urlParams = new URLSearchParams(window.location.search);
	const recebido = urlParams.get('access_token');
	const manter = sessionStorageSeguro.getItem('base44_remember_session') !== 'false';

	if (recebido) {
		urlParams.delete('access_token');
		const query = urlParams.toString();
		const novaUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
		window.history.replaceState({}, document.title, novaUrl);

		const destino = manter ? storage : sessionStorageSeguro;
		const outro = manter ? sessionStorageSeguro : storage;
		destino.setItem(chave, recebido);
		outro.removeItem(chave);
		return recebido;
	}

	const tokenDaAba = sessionStorageSeguro.getItem(chave);
	const tokenPersistente = storage.getItem(chave);

	if (!manter && tokenPersistente) {
		sessionStorageSeguro.setItem(chave, tokenPersistente);
		storage.removeItem(chave);
		return tokenPersistente;
	}

	return tokenDaAba || tokenPersistente;
};
const viteEnv = /** @type {any} */ (import.meta).env || {};
const APP_ID_FALLBACK = "6a2b263c4c1cb1e47d54d8b7";

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		sessionStorageSeguro.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: viteEnv.VITE_BASE44_APP_ID || APP_ID_FALLBACK }),
		token: getAccessToken(),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: viteEnv.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: viteEnv.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}