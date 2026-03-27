// components/PhoneFrame.js
// Responsive app shell — no iPhone chrome, no hydration flash.
// Centered at max-width 430px on desktop, full-width on mobile.
// Accepts backgroundImage prop for backward compatibility (ignored — non-live pages only).

import NavBar from './NavBar';
import { routeValidation, navItemsWithGenius } from '../lib/routes';

export default function PhoneFrame({ children, backgroundImage, showDarkOverlay }) {
  return (
    <div className="app-shell-outer">
      <div className="app-shell-inner">
        <div className="app-shell-content">
          {children}
        </div>
        <NavBar
          navItems={navItemsWithGenius}
          routeValidation={routeValidation}
          isMobile={true}
        />
      </div>
    </div>
  );
}
