import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-indigo-600 font-semibold text-sm mb-2">404 error</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Page not found</h1>
        <p className="text-slate-500 mb-8">
          Sorry, the page you are looking for does not exist.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Go back home
        </Link>
      </div>
    </div>
  );
}
