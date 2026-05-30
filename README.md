# 🏛️ Portal Cultural de Pueblos Originarios de México

Un portal interactivo moderno con diseño responsivo, estética de vidriomorfismo (glassmorphism) y micro-animaciones, enfocado en la **preservación de la memoria inmaterial** de las comunidades indígenas mexicanas. La aplicación permite a los redactores proponer artículos y glosarios sobre lenguas originarias, historia, vestimenta tradicional y gastronomía, los cuales pasan por un proceso seguro de moderación en tiempo real apoyado por Inteligencia Artificial.

---

## ☁️ Análisis Cloud (Parte 1: Teoría)

Esta sección aborda los fundamentos de computación en la nube, estándares de interoperabilidad y seguridad aplicados directamente en la arquitectura de esta aplicación.

### 1. Tipos de Servicio en la Nube (Tema 5.2)
En el ecosistema cloud moderno, los servicios se dividen en tres grandes modelos de servicio (IaaS, PaaS y SaaS). En nuestro proyecto identificamos los siguientes componentes:

*   **PaaS (Platform as a Service - Plataforma como Servicio):**
    *   **Vercel:** Es la plataforma donde desplegamos nuestra aplicación. Vercel abstrae por completo la infraestructura física (servidores, sistemas operativos, hipervisores, redes, contenedores) y nos proporciona un entorno de ejecución listo para desplegar código Next.js. El desarrollador solo se preocupa por escribir el código y la plataforma maneja automáticamente el escalamiento, el enrutamiento HTTP/HTTPS y el aprovisionamiento de certificados SSL.
    *   **Supabase:** Actúa como un modelo PaaS especializado conocido como **BaaS (Backend as a Service)** o **DBaaS (Database as a Service)**. Supabase nos provee una base de datos PostgreSQL completamente administrada con autenticación RLS (Row Level Security), almacenamiento de archivos y triggers en la nube, liberándonos de configurar servidores de base de datos físicos o configuraciones complejas de motores de bases de datos.
*   **SaaS (Software as a Service - Software como Servicio):**
    *   **API de Gemini (Google AI Studio):** Corresponde a un SaaS en su modalidad de **API-as-a-Service**. Google proporciona un modelo de lenguaje de Inteligencia Artificial masivo (`gemini-2.5-flash`) ya entrenado y alojado en sus supercomputadoras. Nosotros consumimos el modelo como un servicio final a través de una petición HTTP cifrada. No tenemos que aprovisionar tarjetas gráficas (GPUs) para entrenar o inferir el modelo, ni configurar clústeres de computación; simplemente consumimos la funcionalidad del software listo para usarse.
*   **IaaS (Infrastructure as a Service - Infraestructura como Servicio):**
    *   *No consumido directamente:* En nuestro proyecto no contratamos servidores dedicados virtuales vacíos (como AWS EC2, Google Compute Engine o Azure VMs) ni configuramos sistemas operativos Linux desde cero o firewalls virtuales. Elegimos PaaS y SaaS para acelerar la velocidad de desarrollo e integración del negocio.

### 2. Estándares e Interoperabilidad (Tema 5.4)
La comunicación entre el servidor frontend de nuestra aplicación (Next.js alojado en Vercel) y la API de Gemini (alojada en los centros de datos de Google) se realiza mediante peticiones HTTP seguras (`HTTPS POST`) utilizando **JSON (JavaScript Object Notation)** como formato para el intercambio de datos.

*   **¿Qué es JSON y por qué viaja en este formato?**
    JSON es un formato de texto ligero, estructurado bajo pares clave-valor (`{"clave": "valor"}`), que es completamente legible tanto por computadoras como por seres humanos.
*   **¿Por qué es un estándar de interoperabilidad?**
    1.  **Independencia de Lenguaje:** JSON no depende de ningún lenguaje de programación. Aunque nació de JavaScript, hoy en día es soportado de forma nativa por Python, PHP, C++, Java y, por supuesto, Node.js en nuestro servidor. Esto permite que nuestro backend de Next.js (Node.js/TypeScript) y los servidores de Google (que podrían estar escritos en C++ o Python) se entiendan perfectamente compartiendo la misma estructura de datos.
    2.  **Ligereza y Rapidez:** Al ser texto plano compacto, consume un ancho de banda mínimo y es sumamente rápido de serializar (convertir variables de código a string de transmisión) y deserializar (convertir el string recibido de vuelta a objetos legibles).

### 3. Seguridad en la Nube (Tema 5.6)
La seguridad en la nube es un modelo de responsabilidad compartida. Una de las vulnerabilidades más críticas y comunes es la filtración accidental de claves criptográficas y credenciales en repositorios públicos.

*   **¿Qué son las Variables de Entorno (`.env`)?**
    Son valores clave-valor configurados externamente al código fuente en el entorno del sistema operativo donde se ejecuta la aplicación. En desarrollo local las guardamos en archivos como `.env.local` y en producción las definimos en la consola de administración de nuestro PaaS (Vercel).
*   **¿Por qué las credenciales (como la API Key de Gemini o las claves de Supabase) NUNCA deben subirse a GitHub?**
    1.  **Exposición Pública:** Si subimos un API Key a GitHub, cualquier persona del mundo o bot automatizado de escaneo (credential scrapers) puede extraer la clave en segundos.
    2.  **Consecuencias Financieras y Operativas:** Con nuestra API Key, terceros malintencionados pueden realizar millones de peticiones consumiendo nuestras cuotas de uso gratuitas o generando cobros excesivos masivos en tarjetas de crédito asociadas.
    3.  **Acceso no Autorizado:** En el caso de Supabase, una clave filtrada podría permitir la lectura, modificación o eliminación malintencionada de toda la base de datos de usuarios y propuestas.
*   **¿Cómo se configuran de forma segura en la plataforma de despliegue (PaaS - Vercel)?**
    En lugar de escribir las claves en el código fuente, usamos variables leídas en tiempo de ejecución: `process.env.API_KEY` (en Node.js/Next.js).
    En **Vercel**, el proceso de configuración segura es:
    1.  Ingresar al panel del proyecto en Vercel.
    2.  Navegar a **Settings** (Configuración) > **Environment Variables** (Variables de Entorno).
    3.  Agregar la variable con el nombre exacto (ej. `API_KEY` o `GEMINI_API_KEY`) y pegar el valor confidencial.
    4.  Vercel encripta este valor en reposo y lo inyecta de forma segura en la memoria RAM del proceso del servidor durante el arranque del contenedor (Serverless Function). Las llaves nunca tocan el disco duro público ni se exponen en el navegador del cliente.

---

## 🛠️ Tecnologías y Arquitectura

*   **Framework**: Next.js 16 (React 19) con TypeScript.
*   **Estilos**: Vanilla CSS con variables nativas de diseño, responsive grids, y efectos glassmorphism.
*   **Base de Datos y Autenticación**: Supabase (PostgreSQL con Row Level Security).
*   **Inteligencia Artificial (SaaS)**: API de Gemini 2.5 Flash de Google AI Studio.
*   **Despliegue PaaS**: Vercel.

---

## 🚀 Instalación y Desarrollo Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/ChristopherJ78/portal-cultural-indigena.git
    cd portal-cultural-indigena
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno locales:**
    Crea un archivo `.env.local` en la raíz del proyecto y define lo siguiente (reemplaza con tus credenciales reales):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase
    API_KEY=tu-clave-api-de-gemini-ai-studio
    ```
    *Nota: El archivo `.env.local` ya se encuentra protegido en el archivo `.gitignore` para prevenir su subida accidental.*

4.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## ✨ Funcionalidades Destacadas de la Unidad 5

*   **Asistente Gemini AI Integrado:** La pantalla de `/redactor` incluye ahora un panel de control con dos superpoderes de Inteligencia Artificial:
    *   **Generador de Borradores:** Escribe el título, elige la categoría, haz clic en el botón y Gemini redactará un artículo cultural completo, estructurado e históricamente rico de 4-5 párrafos sobre el tema.
    *   **Glosario Automático:** Haz clic en agregar glosario y la IA analizará tu texto para identificar términos lingüísticos originarios (en náhuatl, maya, mixteco, etc.), traduciéndolos al español y agregando guías de pronunciación fonética directamente al final del artículo.
*   **API Segura Servidora (Proxy):** Toda la comunicación con Gemini se procesa en el backend del servidor de Next.js. Tus claves API nunca viajan por la red pública del cliente.
