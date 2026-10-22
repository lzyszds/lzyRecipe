import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
import { Notes } from './pages/Notes';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage';
import { ImportModal } from './components/ImportModal';
import { BottomNav } from './components/BottomNav';
import { AnimatedPage } from './components/motion/AnimatedPage';
import { useUIStore } from './store/uiStore';
import { ScrollToTop } from './components/ScrollToTop';
import { syncNativeStatusBar } from './lib/statusBar';
import { startAutoSync } from './lib/cloudSync';
import { AddToMealPlanProvider } from './components/AddToMealPlanProvider';

/** 页面切换动画结束后同步一次原生状态栏颜色（原生端只在启动时设置一次，切页会残留上一页颜色） */
function useStatusBarSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const timer = window.setTimeout(syncNativeStatusBar, 360);
    return () => window.clearTimeout(timer);
  }, [pathname]);
}

function AppRoutes() {
  const location = useLocation();
  useStatusBarSync();
  const showBottomNav = ['/', '/recipes', '/weekly-plan', '/profile'].includes(
    location.pathname
  );

  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <AnimatedPage className="page-shell page-shell--nav">
                <Home />
              </AnimatedPage>
            }
          />
          <Route
            path="/recipes"
            element={
              <AnimatedPage className="page-shell page-shell--nav">
                <AllRecipes />
              </AnimatedPage>
            }
          />
          <Route
            path="/create"
            element={
              <AnimatedPage className="page-shell">
                <CreateRecipe />
              </AnimatedPage>
            }
          />
          <Route
            path="/recipe/:id"
            element={
              <AnimatedPage className="page-shell">
                <RecipeDetail />
              </AnimatedPage>
            }
          />
          <Route
            path="/category/:name"
            element={
              <AnimatedPage className="page-shell">
                <CategoryPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/favorites"
            element={
              <AnimatedPage className="page-shell">
                <Favorites />
              </AnimatedPage>
            }
          />
          <Route
            path="/search"
            element={
              <AnimatedPage className="page-shell">
                <SearchResult />
              </AnimatedPage>
            }
          />
          <Route
            path="/imported"
            element={
              <AnimatedPage className="page-shell">
                <ImportedRecipes />
              </AnimatedPage>
            }
          />
          <Route
            path="/profile"
            element={
              <AnimatedPage className="page-shell page-shell--nav">
                <Profile />
              </AnimatedPage>
            }
          />
          <Route
            path="/settings"
            element={
              <AnimatedPage className="page-shell">
                <Settings />
              </AnimatedPage>
            }
          />
          <Route
            path="/weekly-plan"
            element={
              <AnimatedPage className="page-shell page-shell--nav">
                <WeeklyPlanPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/notes"
            element={
              <AnimatedPage className="page-shell">
                <Notes />
              </AnimatedPage>
            }
          />
          <Route
            path="/help"
            element={
              <AnimatedPage className="page-shell">
                <Help />
              </AnimatedPage>
            }
          />
        </Routes>
      </AnimatePresence>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const { isImportOpen, closeImportModal } = useUIStore();

  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <>
      <Router>
        <AppRoutes />
      </Router>
      <AddToMealPlanProvider />
      <ImportModal isOpen={isImportOpen} onClose={closeImportModal} />
    </>
  );
}
