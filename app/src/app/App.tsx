import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { HomePage } from './routes/HomePage';
import { PostsPage } from './routes/PostsPage';
import { PostPage } from './routes/PostPage';
import { LabPage } from './routes/LabPage';
import { SketchPage } from './routes/SketchPage';
import { NotFoundPage } from './routes/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:slug" element={<PostPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/lab/:slug" element={<SketchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
