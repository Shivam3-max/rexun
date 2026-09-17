/**
 * Bare wrapper so /admin/login can render without a session. Everything that
 * needs a signed-in staff member lives under (dash), which guards itself.
 */
export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
