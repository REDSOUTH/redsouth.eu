# Política de Privacidad

En REDSOUTH Studio creemos que tus datos son tuyos. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos tu información.

## 1. Información que Recopilamos
Solo recopilamos la cantidad mínima de información necesaria para operar REDSOUTH Studio, nuestro sistema de cuentas web y **ONE Launcher**:
- **Información de Cuenta y Autenticación:** Dirección de correo electrónico, estado de verificación, nombre visible, nombre de usuario de REDSOUTH y credenciales de acceso (contraseña cifrada o inicio de sesión OAuth mediante **Google** o **GitHub**).
- **Datos del Perfil de Minecraft:** Tu nombre de jugador de Minecraft, un `minecraft_uuid` interno generado para nuestro sistema de autenticación, el modelo de tu skin (`classic` / `slim`) y la textura `.png` que decidas subir.

## 2. Cómo Usamos Tu Información
Tus datos se utilizan exclusivamente para operar los servicios de REDSOUTH Studio:
- Para autenticar tu sesión en la web y autorizar **ONE Launcher**.
- Para gestionar tu identidad en REDSOUTH, tu perfil de Minecraft y la visualización de tu skin.
- Para garantizar la unicidad de los nombres de usuario y su periodo de cambio (30 días).
- Para enviarte correos esenciales de la cuenta (verificación de correo, confirmación de cambio de email y enlaces de recuperación de contraseña).

## 3. Infraestructura y Terceros
**No vendemos, alquilamos, comercializamos ni cedemos tus datos personales a terceros bajo ninguna circunstancia.**

Toda la información permanece estrictamente en REDSOUTH Studio y en los proveedores de infraestructura necesarios para prestar el servicio:
- **Google Firebase (Authentication y Cloud Firestore):** Gestiona la autenticación, los perfiles de usuario y las reservas de nombres de usuario.
- **Cloudflare (Workers y KV):** Aloja los archivos `.png` de skins subidos y da soporte al protocolo Yggdrasil para ONE Launcher.
- **Vercel:** Aloja la aplicación web de REDSOUTH Studio.

Solo se revelará información si fuese estrictamente exigido por la ley.

## 4. Seguridad
Aplicamos medidas de seguridad modernas, incluyendo cifrado HTTPS/TLS, verificación de tokens mediante Firebase Auth, reglas estrictas de acceso en Firestore y requisitos de contraseña segura para proteger tu cuenta frente a accesos no autorizados.

## 5. Tus Derechos
Tienes derecho a:
- Acceder y consultar los datos personales guardados en tu panel de cuenta (`/account`).
- Actualizar tu información de perfil, correo electrónico, contraseña o skin en cualquier momento.
- **Eliminar tu cuenta** permanentemente en cualquier momento desde los ajustes de tu cuenta. Al eliminarla, tu cuenta de Firebase, tu perfil en Firestore y tus reservas de nombre de usuario serán borrados de forma permanente.

## 6. Contacto
Para cualquier consulta relacionada con la privacidad o solicitud sobre tus datos, el único contacto oficial es Zmito26 a través del correo electrónico **zmitodev@redsouth.eu**.

---
*Última actualización: Noviembre de 2026*
