export function ProjectsPlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Projects</h2>
      <p className="text-slate-500 text-sm">Coming soon — project management UI is being built in T021.</p>
    </div>
  );
}
