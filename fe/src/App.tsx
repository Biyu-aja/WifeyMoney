import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import CharacterCreator from './pages/CharacterCreator';
import Chat from './pages/Chat';
import Wallets from './pages/Wallets';
import DreamItems from './pages/DreamItems';
import DreamItemFormPage from './pages/DreamItemFormPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto min-h-screen relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/dream-items" element={<DreamItems />} />
          <Route path="/dream-items/add" element={<DreamItemFormPage />} />
          <Route path="/dream-items/edit/:id" element={<DreamItemFormPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/character-creator" element={<CharacterCreator />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
