import Hero from './components/Hero';
import Itinerary from './components/Itinerary';
import Villains from './components/Villains';
import Planner from './components/Planner';
import Eggs from './components/Eggs';
import Biomes from './components/Biomes';
import Types from './components/Types';
import Tips from './components/Tips';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <main>
        <Hero />
        <Itinerary />
        <Villains />
        <Planner />
        <Eggs />
        <Biomes />
        <Types />
        <Tips />
      </main>
      <Footer />
    </>
  );
}
