export const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M11.5 11.5L16.5 16.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
export const CartIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 22 20" aria-hidden="true">
    <path d="M1 2h3l2.6 11h11.2L20.5 5H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="8" cy="17" r="1.6" fill="currentColor" />
    <circle cx="17" cy="17" r="1.6" fill="currentColor" />
  </svg>
);
export const MenuIcon = () => (
  <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">
    <path d="M0 2h28M0 10h28M0 18h28" stroke="currentColor" strokeWidth="3" />
  </svg>
);
export const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" />
  </svg>
);
