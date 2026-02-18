import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}
