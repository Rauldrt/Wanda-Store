# 🚀 Pasos para conectar Wanda Admin Pro

¡Felicidades! Ya tienes la estructura de tu nueva App profesional en Next.js. Aquí tienes cómo conectar tu base de datos de Google Sheets:

## 1. Configurar la API en Google Sheets
1. En tu Google Sheet, ve a **Extensiones > Apps Script**.
2. Borra todo el código viejo y pega el contenido de `api-google-sheets.gs` que te generé.
3. Haz clic en **Implementar > Nueva implementación**.
4. Selecciona **Tipo: Aplicación web**.
5. Configura:
   - **Ejecutar como:** Tú (tu email).
   - **Quién tiene acceso:** Cualquiera (esto es necesario para que la App externa pueda entrar).
6. Copia la **URL de la aplicación web** (termina en `/exec`).

## 2. Conectar el Frontend
1. Abre el archivo `frontend/src/lib/api.ts`.
2. Reemplaza `TU_SCRIPT_ID` por la URL que copiaste en el paso anterior.
3. ¡Listo! Tu App ahora hablará directamente con Excel.

## 3. Ejecutar localmente
Para ver tu nueva App en acción:
1. Abre una terminal en la carpeta `frontend`.
2. Ejecuta: `npm run dev`
3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## ✨ Características del Nuevo Panel
- **Dark Mode Automático:** Si tu Windows está en modo oscuro, la app se oscurecerá automáticamente con un tono Navy/Slate elegante.
- **Velocidad:** Los datos se cargan de forma asíncrona, eliminando las esperas del panel viejo.
- **Diseño Móvil:** El dashboard es 100% responsivo.
