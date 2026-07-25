import { Navigate } from 'react-router-dom';

/** Legacy route — Appearance lives under Metas → Fields (General). */
export function AppearancePage() {
  return <Navigate to="/metas/fields?field=appearance" replace />;
}
