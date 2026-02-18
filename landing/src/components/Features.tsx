const features = [
  {
    icon: '🔄',
    title: 'Cross-Platform',
    description:
      'Works with ChatGPT (Custom GPT + Extension) and Claude (MCP Server + Extension). One platform, both AI assistants.',
  },
  {
    icon: '🎯',
    title: 'Smart Context Assembly',
    description:
      'Automatically finds the most relevant docs and web results for your task using semantic search and intelligent scoring.',
  },
  {
    icon: '🔍',
    title: 'Full Transparency',
    description:
      'See exactly what context was assembled and why. Source attribution and section breakdowns let you verify and edit before sending.',
  },
  {
    icon: '📊',
    title: 'Quality Scoring',
    description:
      'Know how well the context covers your task before using it. Coverage, diversity, relevance, and compression sub-scores with actionable suggestions.',
  },
  {
    icon: '⚡',
    title: 'Easy Setup',
    description:
      'Upload your docs, connect your AI assistant, and start getting better results. No complex configuration required.',
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need for better AI responses
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            AgentTailor bridges the gap between your knowledge and your AI assistant.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 transition hover:border-primary-200 hover:shadow-md"
            >
              <div className="mb-3 text-3xl">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
