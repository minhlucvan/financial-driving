import { GameProvider } from './context/GameContext';
import GameLayout from './components/GameLayout';
import './App.css';

function App() {
  return (
    <GameProvider>
      <GameLayout initialDataset="sp500" />
    </GameProvider>
  );
}

export default App;
