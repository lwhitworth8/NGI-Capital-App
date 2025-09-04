export const metadata = {
  title: 'NGI Capital Advisory - Student Portal',
  description: 'Opportunities and applications for students',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display:'flex', minHeight:'100vh' }}>
          <aside style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>NGI Advisory</h2>
            <nav style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <a href="/projects">Projects</a>
              <a href="/applications">Applications</a>
            </nav>
          </aside>
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </body>
    </html>
  )
}

