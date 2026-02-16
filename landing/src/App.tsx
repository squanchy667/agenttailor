export function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AgentTailor
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            Cross-platform AI agent tailoring
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Make your AI agents smarter by automatically assembling optimal context
            from documents and web search.
          </p>
          <div className="mt-12 flex justify-center gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2">ChatGPT</h3>
              <p className="text-sm text-gray-600">Intelligent context injection</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Claude</h3>
              <p className="text-sm text-gray-600">Smart document assembly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
