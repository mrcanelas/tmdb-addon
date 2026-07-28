import { Navigate } from 'react-router-dom';

/** Legacy route — Language & Region live under Metas → Fields (General). */
export function LanguageRegionPage() {
  return <Navigate to="/metas/fields?field=general" replace />;
}
