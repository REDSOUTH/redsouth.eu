> 🚀 **¡Ya está disponible!** Entra y pruébalo gratis ahora mismo en: **[modpkg.redsouth.eu](https://modpkg.redsouth.eu)**

## 1. ¿Qué es MODPKG?

**MODPKG** es una aplicación web moderna, ágil y de código abierto diseñada para construir, gestionar y empaquetar modpacks de Minecraft de forma 100% universal e independiente de cualquier launcher comercial.

Históricamente, los creadores de modpacks y comunidades de Minecraft han estado atados a ecosistemas cerrados (CurseForge Launcher, Modrinth App, Prism Launcher, etc.), donde compartir o exportar un paquete a menudo requiere instalar software pesado o sufrir bloqueos de plataforma. MODPKG rompe con estas limitaciones ejecutándose **directamente en el navegador web** (In-Browser Engine), permitiendo que cualquier usuario organice mods, texturas, shaders, datapacks y archivos de configuración en segundos, y exporte un paquete listo para jugar o desplegar en servidores.

---

## 2. Principios y Filosofía de Diseño

1. **Zero Launcher Lock-In (Sin dependencias):**  
   Los paquetes creados con MODPKG no requieren ningún lanzador obligatorio. Se pueden exportar como `.zip` universales compatibles con Minecraft Vanilla, servidores dedicados o cualquier lanzador de terceros.
2. **100% Client-Side & Privacidad Total:**  
   Todo el motor de empaquetado, compresión, guardado y análisis se ejecuta localmente en el navegador del usuario utilizando `localStorage`, `IndexedDB` y `JSZip`. Ningún dato privado ni archivo se transmite a servidores externos sin autorización expresa del usuario.
3. **Multi-Loader & Multi-Versión Nativo:**  
   Soporte directo para todos los loaders modernos de la comunidad: **Fabric, Forge, NeoForge y Quilt**, así como compatibilidad con cualquier versión de Minecraft (desde las más recientes hasta versiones legacy).
4. **Diseño Visual e Identidad REDSOUTH:**  
   Interfaz cuidada al detalle con modo oscuro y claro, acentos corporativos en naranja MODPKG (`#FE5000`), microinteracciones fluidas con Framer Motion, menús contextuales no intrusivos y tooltips descriptivas.

---

## 3. Ecosistema de Formatos Oficiales

MODPKG introduce y estandariza un ecosistema de formatos optimizados:

| Extensión | Tipo | Propósito |
| :--- | :--- | :--- |
| **`.mpkg`** | **Manifiesto de Versión** | Archivo JSON ligero que contiene el índice de una versión concreta del modpack. |
| **`.mpkg-proj`** | **Archivo de Proyecto Completo** | Respaldo íntegro de todo el proyecto: metadatos, historial completo y archivos personalizados inline. |
| **`.mpkg.zip`** | **Bundle Universal Completo** | Archivo `.zip` autocontenido y listo para usar. Empaqueta físicamente todos los `.jar` y configuraciones. |

---

## 4. Estructura y Módulos de la Aplicación

### 4.1. Página de Inicio (Home)
- **Acceso rápido al último paquete activo** con badge dinámico del loader y versión.
- Métricas en vivo del almacenamiento local (número de proyectos guardados).
- Accesos directos a la biblioteca, al importador y características clave de la plataforma.

### 4.2. Editor de Paquetes (Package Editor)
El corazón de la aplicación, concebido como una estación de trabajo interactiva:
- **Barra Superior:** Selector desplegable para alternar instantáneamente entre distintos modpacks sin recargar la página.
- **Barra Lateral:** Filtro por fuentes de contenido, categoría (Mods, Resourcepacks, Shaders, etc.) y entorno (Cliente, Servidor).
- **Rejilla de Contenido:** Tarjetas dinámicas con selector de versiones (Latest, Latest Unstable) y descarga directa.
- **Visor Flotante Plegable:** Dock en la parte inferior que muestra el contenido instalado en el paquete actual.

### 4.3. Espacio de Trabajo de Archivos (`customFiles`)
- **Árbol de Directorios Interactivo:** Crear carpetas, añadir archivos, renombrar o eliminar recursivamente.
- **Editor Monaco Integrado:** Editor de código profesional en el navegador para archivos de configuración o scripts.

### 4.4. Mi Biblioteca & Recursos Globales
- Vista panorámica de todos los modpacks creados y guardados en el navegador.
- Prevención de colisiones y limpieza atómica de almacenamiento.
- **Mis Recursos Globales:** Biblioteca transversal que permite guardar configuraciones de mods o archivos externos una sola vez y reutilizarlos.

### 4.5. Exportación Avanzada
Permite exportar el modpack en tres niveles: `.mpkg`, `.mpkg-proj` o compilar todo en un `.mpkg.zip` universal con descarga en segundo plano y barra de progreso.

---

## 5. Accesibilidad, Internacionalización y UX

- **5 Idiomas con Detección Automática:** English, Español, Português, Français, Deutsch.
- **Selector de Tema:** Modo Claro, Modo Oscuro y Sincronización con el Sistema Operativo.
- **Sistema de Alertas Dinámico:** Notificaciones multilingües con estado persistente.
- **Diseño Responsive:** Adaptado para monitores, portátiles y pantallas móviles.

---

## 6. Próximos Pasos en el Roadmap

- 🌐 **MODPKG Discover:** Catálogo comunitario para explorar, votar y descargar modpacks creados por otros miembros.
- 📖 **MODPKG Docs:** Guías para creadores, especificación técnica y tutoriales.
- ☁️ **Sincronización en la Nube con Cuenta REDSOUTH:** Respaldo automático de proyectos y sincronización multidispositivo.
- ⚡ **MODPKG Bridge:** Nuestro nuevo agente local en desarrollo, escrito en Rust, que conectará la web directamente con tu PC para sincronizar e instalar mods con un solo clic.

---

*Desarrollado con pasión por @Zmito26 en REDSOUTH Studio.*
