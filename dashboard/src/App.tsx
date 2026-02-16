import { PLATFORMS } from '@agenttailor/shared';

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AgentTailor Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Cross-platform AI agent tailoring for {PLATFORMS.CHATGPT} and {PLATFORMS.CLAUDE}
          </p>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-700">
              Dashboard is running. API health check at{' '}
              <a
                href="http://localhost:4000/health"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                http://localhost:4000/health
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
