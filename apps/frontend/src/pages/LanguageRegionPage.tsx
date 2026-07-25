import { Navigate } from 'react-router-dom';

/** Legacy route — Language lives under Metas → Fields (General). */
export function LanguageRegionPage() {
  return <Navigate to="/metas/fields?field=language" replace />;
}
