import './globals.css';

export const metadata = {
  title: 'Dubai Trip Tracker',
  description: 'A beautifully designed memories tracker for my Dubai trip.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
