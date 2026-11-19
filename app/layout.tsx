import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./revision-ui.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRINT IT — Catálogo revisión",
  description: "Versión de revisión con notas del catálogo PRINT IT",
};

const themeBoot = `try{if(localStorage.getItem("printit-theme")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={montserrat.variable} style={{ margin: 0 }}>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {children}
      </body>
    </html>
  );
}
