import Hero from './components/Hero';
import Itinerary from './components/Itinerary';
import Tracker, { TrackerOnly } from './components/Tracker';
import Villains from './components/Villains';
import League from './components/League';
import Planner from './components/Planner';
import Eggs from './components/Eggs';
import Shop from './components/Shop';
import Biomes from './components/Biomes';
import Encounters from './components/Encounters';
import Types from './components/Types';
import Tips from './components/Tips';
import Footer from './components/Footer';

export default function App() {
  if (new URLSearchParams(location.search).has('tracker')) return <TrackerOnly />;
  return (
    <>
      <main>
        <Hero />
        <Tracker />
        <Itinerary />
        <Villains />
        <League />
        <Planner />
        <Eggs />
        <Shop />
        <Biomes />
        <Encounters />
        <Types />
        <Tips />
      </main>
      <Footer />
    </>
  );
}
