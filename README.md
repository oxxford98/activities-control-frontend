# activities-control-frontend
## Requisitos previos

- Node.js 20 o superior
- npm

## Instalacion local

1. Clonar repositorio.
2. Instalar dependencias:

```bash
npm ci
```

3. Crear archivo de entorno local:

```bash
cp .env.example .env.local
```

## Desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en http://localhost:3000.

## Build de produccion

```bash
npm run build
npm run start
```

## Docker

### Ejecutar en local con Docker Compose (recomendado)

```bash
docker compose --env-file .env.local up --build -d
```

Para detenerlo:

```bash
docker compose down
```

**Nota sobre variables de entorno:** Docker Compose lee un archivo `.env` por defecto, no `.env.local`. Para usar las variables de `.env.local`:
- Opción 1 (recomendada): Usa el flag `--env-file .env.local` en el comando (como arriba)
- Opción 2: Copia `.env.local` a `.env`: `cp .env.local .env`

Este mismo archivo docker-compose.yml se usa para produccion.

### Build local de imagen manual (opcional)

```bash
docker build -t activities-control-frontend:local .
```

### Ejecutar contenedor local manual (opcional)

```bash
docker run --rm -p 3000:3000 activities-control-frontend:local
```

Si necesitas sobreescribir variables NEXT_PUBLIC para el build local, exportalas antes de ejecutar docker compose up --build.

## CI/CD (GitHub Actions)

Se agregaron dos workflows:

- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

Que realizan:

1. CI en Pull Request y Push a main:
- npm ci
- npm run lint
- npm run build

2. CD en Push a main:
- Sube el codigo al servidor Ubuntu por SSH
- Ejecuta docker compose up --build -d en el servidor

## Variables y secretos requeridos en GitHub

### Repository Variables

- NEXT_PUBLIC_API_URL

### Repository Secrets

- SSH_HOST
- SSH_USER
- SSH_PORT
- SSH_PRIVATE_KEY
- DEPLOY_PATH

Notas:
- El servidor Ubuntu debe tener Docker y Docker Compose instalados.

## Produccion en Ubuntu

El workflow sube el proyecto al servidor en DEPLOY_PATH y ejecuta docker compose con build.

Comandos ejecutados en despliegue:

```bash
docker compose up --build -d --remove-orphans
```

## PM2 y Docker

Para esta app ya no es necesario PM2 si se ejecuta como contenedor, porque Docker Compose se encarga de mantener el proceso activo con restart: unless-stopped.