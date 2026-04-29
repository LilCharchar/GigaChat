export default function createHttpError(message, status = 500, options = {}) {
  const error = new Error(message, options);
  error.status = status;
  return error;
}
