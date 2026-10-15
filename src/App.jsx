import SplitText from './components/SplitText/SplitText';
import RunTrack from './components/RunTrack';

export default function App() {
  return (
    <main className="wrap">
      <header className="hero">
        <SplitText
          tag="h1"
          text="200 waves to Eternatus"
          splitType="chars"
          delay={35}
          duration={1}
          textAlign="left"
          trigger="load"
        />
        <p className="sub">A field guide to a PokeRogue Classic run</p>
      </header>
      <RunTrack />
      <p className="foot">React prototype of one section. Fight waves read from the PokeRogue source. Headline effect: Split Text from React Bits.</p>
    </main>
  );
}
