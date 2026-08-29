import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Siracusa Lite",
  description: "Sistema de gestión de riego y fertilización",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${roboto.variable} h-full antialiased`}
    >
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 font-roboto">
        <nav className="bg-white shadow-sm border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-xl font-bold text-blue-700">🌿 Siracusa Lite</span>
              </div>
              <div className="flex items-center space-x-1">
                <a href="#calendario" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Calendario
                </a>
                <a href="#solicitudes" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Solicitudes
                </a>
                <a href="#recetas" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Recetas
                </a>
                <a href="#asignaciones" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Asignaciones
                </a>
                <a href="#consumo" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Consumo
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
