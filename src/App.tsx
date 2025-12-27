import { AppStateProvider } from './context/AppStateProvider';
import GameLayout from './components/GameLayout';
import './App.css';

function App() {
  return (
    <AppStateProvider initialDataset="sp500">
      <GameLayout />
    </AppStateProvider>
  );
}

export default App;
