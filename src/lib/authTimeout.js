export function withAuthTimeout(promise, timeoutMs = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      const error = new Error("A autenticação demorou mais que o esperado. Tente novamente.");
      error.code = "AUTH_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}