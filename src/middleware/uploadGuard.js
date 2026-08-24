// A malformed/truncated multipart body can emit an unhandled 'error' event deep in
// busboy's parser, crashing the whole Node process. This turns it into a normal 400.
export function guardRequestStream(req, res, next) {
  req.on('error', () => {
    if (!res.headersSent) {
      res.status(400).json({ error: 'Upload was interrupted, please try again' });
    }
  });
  next();
}
