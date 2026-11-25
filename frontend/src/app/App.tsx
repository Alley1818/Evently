import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button, PageHeader, PageLoading, StatePanel } from '@/components/shared/ui';
import { EventsPage, EventDetailsPage } from '@/features/events/EventsPage';
import { EndpointsPage, EndpointDetailsPage } from '@/features/endpoints/EndpointsPage';
import { DeliveriesPage, DeliveryDetailsPage } from '@/features/deliveries/DeliveriesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

const OverviewPage = lazy(() => import('@/features/overview/OverviewPage').then(({ OverviewPage }) => ({ default: OverviewPage })));
const PlaygroundPage = lazy(() => import('@/features/playground/PlaygroundPage').then(({ PlaygroundPage }) => ({ default: PlaygroundPage })));

function MissingPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <StatePanel
        title="This address has no page"
        action={<Button asChild variant="secondary"><Link to="/">Back to Overview</Link></Button>}
      />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Suspense fallback={<PageLoading />}><OverviewPage /></Suspense>} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailsPage />} />
        <Route path="endpoints" element={<EndpointsPage />} />
        <Route path="endpoints/:id" element={<EndpointDetailsPage />} />
        <Route path="deliveries" element={<DeliveriesPage />} />
        <Route path="deliveries/:id" element={<DeliveryDetailsPage />} />
        <Route path="playground" element={<Suspense fallback={<PageLoading />}><PlaygroundPage /></Suspense>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<MissingPage />} />
      </Route>
    </Routes>
  );
}
