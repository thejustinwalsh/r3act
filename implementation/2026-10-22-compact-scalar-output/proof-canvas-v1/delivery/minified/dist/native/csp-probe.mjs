globalThis.__r3actScalarCsp = { blocked: false, violations: [] };
document.addEventListener('securitypolicyviolation', event => {
  globalThis.__r3actScalarCsp.violations.push(event.blockedURI);
});
try { Function('return 1')(); } catch (error) {
  globalThis.__r3actScalarCsp.blocked = error instanceof EvalError;
}
