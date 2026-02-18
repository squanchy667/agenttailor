export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Give your AI agents
            <span className="block text-primary-600">the context they need</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
            AgentTailor automatically assembles optimal context from your documents and web search,
            so ChatGPT and Claude deliver dramatically better results.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/signup"
              className="rounded-lg bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              Get Started Free
            </a>
            <a
              href="#features"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              See how it works
            </a>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-2 gap-6 sm:max-w-xl">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-2 text-2xl">🤖</div>
              <h3 className="font-semibold text-gray-900">ChatGPT</h3>
              <p className="mt-1 text-sm text-gray-500">Custom GPT + Chrome Extension</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-2 text-2xl">🧠</div>
              <h3 className="font-semibold text-gray-900">Claude</h3>
              <p className="mt-1 text-sm text-gray-500">MCP Server + Chrome Extension</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
