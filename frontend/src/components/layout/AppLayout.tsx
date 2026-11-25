import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Activity, BookOpen, ChevronRight, CircleHelp, CodeXml, ExternalLink, FlaskConical,
  LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Radio, Send, Settings, Webhook, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { apiDocsUrl } from '@/api/client';
import { usePreferences } from '@/app/preferences';
import { Button } from '@/components/shared/ui';
import { formatId } from '@/lib/format';

const groups = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: LayoutGrid },
      { to: '/events', label: 'Events', icon: Radio, kind: 'event' },
      { to: '/endpoints', label: 'Endpoints', icon: Webhook, kind: 'endpoint' },
      { to: '/deliveries', label: 'Deliveries', icon: Activity, kind: 'delivery' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/playground', label: 'Event Playground', icon: FlaskConical },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

const externalLinks = [
  { href: apiDocsUrl, label: 'API Documentation', icon: BookOpen },
  { href: 'https://github.com/Alley1818/Evently', label: 'GitHub', icon: CodeXml },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link to="/" className="brand" onClick={onNavigate} aria-label="Evently overview">
        <img src="/evently.svg" alt="" width={33} height={33} />
        <span>Evently<span className="brand-period">.</span></span>
      </Link>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map(({ label, items }) => (
          <div className="sidebar-group" key={label}>
            <p className="sidebar-label">{label}</p>
            {items.map(({ to, label: name, icon: Icon }) => (
              <NavLink
                className="sidebar-link"
                to={to}
                end={to === '/'}
                title={name}
                aria-label={name}
                onClick={onNavigate}
                key={to}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        {externalLinks.map(({ href, label, icon: Icon }) => (
          <a
            className="sidebar-link"
            href={href}
            title={label}
            aria-label={label}
            key={label}
            target="_blank"
            rel="noreferrer"
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            <ExternalLink className="sidebar-external" size={12} aria-hidden="true" />
          </a>
        ))}
      </div>
    </>
  );
}

export function AppLayout() {
  const { mode, setMode } = usePreferences();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const menuOpener = useRef<HTMLButtonElement>(null);
  const section = groups.flatMap((group) => [...group.items]).find(({ to }) => (
    pathname === to || (to !== '/' && pathname.startsWith(`${to}/`))
  ));
  const SectionIcon = section?.icon ?? CircleHelp;
  const detail = pathname.split('/')[2];
  const parsedId = Number(detail);
  const detailLabel = detail && section && 'kind' in section && Number.isSafeInteger(parsedId)
    ? formatId(section.kind, parsedId, mode)
    : undefined;
  const quickAction = section?.to === '/' || section?.to === '/deliveries';

  useEffect(() => {
    document.title = `${section?.label ?? 'Page not found'} · Evently`;
  }, [section]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => {
      if (desktop.matches && mobileMenu.current?.open) mobileMenu.current.close();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function closeMenu() {
    mobileMenu.current?.close();
  }

  function closeOutside(event: MouseEvent<HTMLDialogElement>) {
    if (event.currentTarget === event.target) closeMenu();
  }

  return (
    <div className="app-shell" data-sidebar={collapsed ? 'compact' : 'expanded'}>
      <a className="skip-link" href="#page-content">Skip to main content</a>
      <aside className="sidebar"><Sidebar /></aside>
      <dialog
        ref={mobileMenu}
        className="mobile-sidebar"
        aria-label="Navigation"
        onClick={closeOutside}
        onClose={() => menuOpener.current?.focus()}
      >
        <div className="mobile-sidebar-content">
          <Button variant="ghost" size="icon" className="mobile-close" aria-label="Close navigation" onClick={closeMenu}>
            <X size={19} aria-hidden="true" />
          </Button>
          <Sidebar onNavigate={closeMenu} />
        </div>
      </dialog>
      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="collapse-trigger"
              variant="ghost"
              size="icon"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
            </Button>
            <Button
              className="mobile-trigger"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              ref={menuOpener}
              onClick={() => mobileMenu.current?.showModal()}
            >
              <Menu size={20} aria-hidden="true" />
            </Button>
            <span className="topbar-divider" aria-hidden="true" />
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <SectionIcon size={15} aria-hidden="true" />
              {detailLabel && section ? (
                <>
                  <Link to={section.to}>{section.label}</Link>
                  <ChevronRight size={13} aria-hidden="true" />
                  <span className="breadcrumb-id" aria-current="page">{detailLabel}</span>
                </>
              ) : (
                <span aria-current="page">{section?.label ?? 'Page not found'}</span>
              )}
            </nav>
          </div>
          <div className="topbar-actions">
            <div className="mode-switch" role="group" aria-label="Data mode">
              <button type="button" aria-label="Demo mode" aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>
                <span className="mode-indicator demo-indicator" aria-hidden="true" />Demo
              </button>
              <button type="button" aria-label="Live mode" aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
                <span className="mode-indicator live-indicator" aria-hidden="true" />Live
              </button>
            </div>
            {quickAction && (
              <Button asChild className="topbar-send">
                <Link to="/playground">
                  <Send size={14} aria-hidden="true" />
                  <span>Send event</span>
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main id="page-content" className="page-content" key={mode}><Outlet /></main>
      </div>
    </div>
  );
}
