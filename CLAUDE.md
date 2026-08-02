# Aplicación de Gestión de Proyectos

## Requisitos de Negocio

Este proyecto está construyendo una Aplicación de Gestión de Proyectos multiusuario. Características principales:
- Un usuario se puede registrar e iniciar sesión con credenciales propias (usuario/contraseña, con contraseña hasheada en la base de datos)
- Un usuario puede cambiar su propia contraseña desde dentro de la aplicación
- Un usuario puede tener varios tableros Kanban y elegir con cuál trabajar
- Cada tablero Kanban tiene columnas (por defecto las fijas del MVP original) que se pueden renombrar; un tablero puede tener sus propias columnas
- Las tarjetas del tablero Kanban se pueden mover con arrastrar y soltar, y editar
- Hay una característica de chat con IA en la barra lateral; la IA puede crear / editar / mover una o más tarjetas dentro del tablero activo
- Cada usuario tiene un nivel: `admin` o `basico`. Solo un usuario `admin` puede acceder al módulo de administración de usuarios (listar, crear, cambiar nivel, resetear contraseña, eliminar usuarios)
- Toda la interfaz (textos visibles del sitio) está en español

## Limitaciones

El MVP original (login hardcodeado `user`/`password`, 1 solo tablero por usuario) ya fue completado — ver Partes 1 a 10 en `docs/PLAN.md`. A partir de la Parte 11 el proyecto evoluciona a multiusuario real y multi-tablero; a partir de la Parte 13 se agregan niveles de usuario (admin/básico), cambio de contraseña, y un módulo de administración; las limitaciones de abajo aplican desde ahí en adelante.

Autenticación real por usuario: registro con usuario/contraseña, contraseña hasheada (nunca en texto plano), sesión mediante cookie/token simple. Sin recuperación de contraseña por email — mantenerlo simple (solo cambio de contraseña autenticado, o reseteo por un admin).

Cada usuario puede tener múltiples tableros Kanban (crear, renombrar, eliminar, listar) y cambiar entre ellos. Las columnas y tarjetas pertenecen a un tablero, no directamente a un usuario.

Un usuario nuevo que se autorregistra siempre queda con nivel `basico`. Solo existe un usuario semilla con nivel `admin` (`admin`/`admin`); otros usuarios `admin` solo pueden crearse desde el propio módulo de administración (un admin promoviendo a otro usuario), no hay autorregistro como admin.

Esto sigue ejecutándose localmente (en un contenedor docker), sin despliegue multi-tenant en la nube como requisito de esta etapa.

## Decisiones Técnicas

- Frontend NextJS
- Backend Python FastAPI, incluyendo servir el sitio estático NextJS en /
- Todo empaquetado en un contenedor Docker
- Usar "uv" como gestor de paquetes para python en el contenedor Docker
- Usar OpenRouter para las llamadas de IA. Una OPENROUTER_API_KEY está en .env en la raíz del proyecto
- Usar `openai/gpt-oss-20b:free` como modelo (nota: `openai/gpt-oss-120b:free` dejó de estar disponible gratis en OpenRouter, confirmado con la API real en la Parte 8; `20b` es el modelo hermano gratuito vigente)
- Usar base de datos SQLLite local, creando una nueva bd si no existe
- Scripts de inicio y parada del servidor para Mac, PC, Linux en scripts/

## Punto de Partida

Un MVP funcional del frontend ya ha sido construido y está en frontend. Esto aún no está diseñado para la configuración de Docker. Es una demostración puramente frontend.

## Esquema de Color

- Amarillo Acentuado: `#ecad0a` - líneas acentuadas, destacados
- Azul Primario: `#209dd7` - enlaces, secciones clave
- Púrpura Secundario: `#753991` - botones de envío, acciones importantes
- Azul Marino Oscuro: `#032147` - títulos principales
- Texto Gris: `#888888` - texto de apoyo, etiquetas

## Estándares de Codificación

1. Usar las últimas versiones de librerías y enfoques idiomáticos a partir de hoy
2. Mantenerlo simple - NUNCA sobre-ingenierizar, SIEMPRE simplificar, NO hay programación defensiva innecesaria. Sin características extra - enfócate en la simplicidad.
3. Ser conciso. Mantener README mínimo. IMPORTANTE: nunca emojis
4. Cuando encuentres problemas, siempre identifica la causa raíz antes de intentar una solución. No adivines. Prueba con evidencia, luego corrige la causa raíz.

## Documentación de Trabajo

Todos los documentos para planificación y ejecución de este proyecto estarán en el directorio docs/.
Por favor revisa el documento docs/PLAN.md antes de continuar.