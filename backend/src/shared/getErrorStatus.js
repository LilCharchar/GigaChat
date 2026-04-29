export default function getErrorStatus(error, fallback = 500) {
  return Number(error?.status) || fallback;
}
