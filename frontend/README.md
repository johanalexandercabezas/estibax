# EstibaX Frontend

Aplicación PWA desarrollada con React 18, Vite 5, TypeScript 5 y Tailwind CSS 3.

## Scripts

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Previsualizar build
npm run lint      # Verificar formato
npm run format    # Formatear código
```

## Estructura

```text
src/
├── main.tsx      # Punto de entrada y registro del service worker
├── App.tsx       # Layout principal y dashboard provisional
└── index.css     # Estilos base + directivas Tailwind

public/
├── manifest.json # Manifest PWA
└── sw.js         # Service worker básico
```

## PWA

La aplicación incluye un `manifest.json` y un service worker que cachea los assets estáticos para funcionamiento offline básico.

## Convenciones

- Componentes funcionales con TypeScript.
- Estilos con Tailwind CSS.
- Formato con Prettier.
- Mínimo de animaciones, priorizando velocidad operativa.
