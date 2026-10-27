import { SceneIsland } from '@/components/islands/SceneIsland';
import { Hero } from '@/components/sections/Hero';

export function HomePage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <SceneIsland />
      <Hero />
    </div>
  );
}
