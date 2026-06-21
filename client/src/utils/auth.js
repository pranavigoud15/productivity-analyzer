export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
 
export function clearAuthAndRedirect() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}