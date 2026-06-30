// app/layout.tsx
export const metadata = {
  title: "SmartAgro",
  description: "Planificación agrícola inteligente para Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
