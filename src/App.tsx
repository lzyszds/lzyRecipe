import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { RecipeDetail } from './pages/RecipeDetail';
import { CategoryPage } from './pages/CategoryPage';
import { Favorites } from './pages/Favorites';
import { SearchResult } from './pages/SearchResult';
import { ImportedRecipes } from './pages/ImportedRecipes';
import { Profile } from './pages/Profile';
import { AllRecipes } from './pages/AllRecipes';
import { CreateRecipe } from './pages/CreateRecipe';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { ImportModal } from './components/ImportModal';
import { BottomNav } from './components/BottomNav';
import { useUIStore } from './store/uiStore';

function AppRoutes() {
  const location = useLocation();
  const showBottomNav = ['/', '/profile'].includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<AllRecipes />} />
        <Route path="/create" element={<CreateRecipe />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/search" element={<SearchResult />} />
        <Route path="/imported" element={<ImportedRecipes />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const { isImportOpen, closeImportModal } = useUIStore();

  return (
    <>
      <Router>
        <AppRoutes />
      </Router>
      <ImportModal isOpen={isImportOpen} onClose={closeImportModal} />
    </>
  );
}
