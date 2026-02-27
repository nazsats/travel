import { Providers } from '../components/Providers';
import './globals.css';

export const metadata = {
  title: 'Dubai Trip Tracker',
  description: 'A beautifully designed memories tracker for my Dubai trip.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="container">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
