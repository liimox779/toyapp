// Express 4 does not catch rejected promises from async route handlers — an unhandled
// rejection there crashes the whole Node process. Wrapping every async handler in this
// forwards the error to next() instead, so it's a normal 500 response.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
