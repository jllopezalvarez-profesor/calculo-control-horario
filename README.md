# Calculadora de fichajes

Extensión para Chromium/Chrome que procesa la página de control de horario en app.control-de-horario.com y calcula las horas trabajadas por día y por semana.  

## Instalación

1. Descarga o clona este repositorio en tu equipo.
2. Abre Chromium y navega a `chromium://extensions/` (o `chrome://extensions/` en Chrome).
3. Activa el **Modo de desarrollador** (interruptor en la esquina superior derecha).
4. Haz clic en **Cargar extensión sin empaquetar**.
5. Selecciona la carpeta **extension** del repositorio. **Importante**: La carpeta "extension" que se ha seleccionado, debe seguir existiendo si quieres que al abrir de nuevo Chrome tengas la funcionalidad disponible. Si borras la carpeta, tendrás que volver a descargarla y volver a añadirla a extensiones.

La extensión quedará instalada y activa.

## Uso

1. Abre la página web de control de horario en el navegador.
2. Accede al registro de entradas y salidas. Selecciona el rango / página de datos con los que quieras trabajar 
3. Haz clic derecho en cualquier parte de la página.
4. En el menú contextual, selecciona **Calcular fichajes**.
5. Se abrirá automáticamente una nueva pestaña con el resumen.

## Resultados

La página de resultados muestra tres secciones:

- **Hoy**: estado del día actual.
  - Si no hay fichajes: se indica que no hay datos.
  - Si hay entrada pero no salida: se muestra la hora de entrada y el tiempo trabajado hasta el momento actual (en curso).
  - Si hay entrada y salida: se muestra la hora de entrada y el total trabajado.
- **Semanal**: horas totales trabajadas cada semana, con el rango de fechas (primer y último día con fichaje), ordenadas de más reciente a más antigua.
- **Diario**: tabla con las horas trabajadas cada día, ordenada de más reciente a más antigua. Cuando se han aplicado correcciones automáticas a los datos de un día, aparecen iconos en la fila correspondiente:
  - 🔁 Se eliminaron fichajes duplicados (mismo tipo y hora repetidos).
  - ✂️ Se descartaron fichajes intermedios (solo se conserva la primera entrada y la última salida del día).
  - Al hacer clic en los iconos se despliega el detalle de qué fichajes concretos se eliminaron o descartaron.

## Notas

- Los cálculos se hacen con los datos que haya en pantalla en el momento de ejecutar la extensión. Usar el selector de número de registros, la ordenación de la tabla y el paginador para "seleccionar" los registros con los que se trabajará. 
- Se ignoran días que empiezan con una salida sin entrada previa. Esto puede pasar cuando se muestran los últimos n registros, y el más antiguo es una salida.
- Si en un día la primera entrada es posterior a la última salida, ese día se descarta (claramente es erróneo) y no aparece en los resultados. No se informa del error (de momento, quizá se haga más adelante).
- Los fichajes duplicados se eliminan automáticamente antes del cálculo. Esto se hace en dos fases:
    - Primero se elimina duplicados exactos. Esto es que, si se registra tres veces la entrada a cierta hora, sólo se evalúa una.
    - Luego, se eliminan fichajes intermedios cada día. Esto es, de cada día, se mantiene la primera entrada y la última salida. Cualquier evento intermedio se elimina. **Importante:** Esto implica que si se sale a comer y se ficha la salida, esta salida se ignora y se computa como tiempo de trabajo. En un futuro se podría mejorar el algoritmo para tener en cuenta periodos de cierta duración. 

## Incidencias y sugerencias

Si encuentras algún problema en los cálculos, o tienes alguna sugerencia de mejora, puedes abrir un [issue](../../issues) en este repositorio. Intenta incluir:

- Una descripción clara del problema o la mejora que propones.
- Los pasos para reproducirlo (si es un bug).
- Capturas de pantalla o ejemplos si ayudan a entenderlo.

## Contribuir

Las contribuciones son bienvenidas. Si quieres proponer un cambio:

1. Haz un fork del repositorio.
2. Crea una rama con un nombre descriptivo (`git checkout -b mejora-calculo-descansos`).
3. Realiza tus cambios y haz commit.
4. Abre un pull request explicando qué cambia y por qué.

Si no estás seguro de si un cambio encaja, abre primero un issue para comentarlo.
