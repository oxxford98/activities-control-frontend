# activities-control-frontend
## Requisitos previos

- Node.js (v18 o superior)
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd activities-control-frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```
Editar el archivo `.env` con los valores correspondientes:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## Iniciar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Compilar para producción

```bash
npm run build
```

## Previsualizar build de producción

```bash
npm run preview
```