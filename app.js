// app.js - Lógica principal del Sistema de Turnos

// Inicializamos el Broadcast Channel para la comunicación entre diferentes pestañas/ventanas.
// Es fundamental que el nombre del canal ('sistema_turnos_channel') sea el mismo en todas las instancias.
const channel = new BroadcastChannel('sistema_turnos_channel');

// Variable para almacenar el turno que está actualmente "en llamado" o siendo gestionado.
// Esto permite que el sistema sepa qué turno debe cancelar o atender.
let turnoActual = null;

// --- Código para la Vista de Control (index.html) ---
// Obtenemos las referencias a los elementos HTML de la página de control.
const llamarBtn = document.getElementById('llamar-btn');
const nombreInput = document.getElementById('nombre');
const consultorioSelect = document.getElementById('consultorio');
// const sedeSelect = document.getElementById('sede'); // La sede ha sido comentada temporalmente.
const cancelarBtn = document.getElementById('cancelar-btn');
const atenderBtn = document.getElementById('atender-btn');


function llamarPaciente(paciente, consultorio) {
    const textoLlamado = `Paciente ${paciente}, por favor pase al consultorio ${consultorio}.`;

    // 1. Encontramos la voz que nos gusta
    const voices = speechSynthesis.getVoices();
    const vozSeleccionada = voices.find(voice => voice.name === 'Google español de Estados Unidos');

    // 2. Creamos el objeto de voz y le asignamos la voz
    const utterance = new SpeechSynthesisUtterance(textoLlamado);
    
    // Si encontramos la voz, la asignamos. Si no, usará la voz por defecto del navegador.
    if (vozSeleccionada) {
        utterance.voice = vozSeleccionada;
    }
    
    // Ajustes adicionales (opcional)
    utterance.volume = 1; // Volumen (0 a 1)
    utterance.rate = 1;    // Velocidad (0.1 a 10)
    utterance.pitch = 1;   // Tono (0 a 2)
    utterance.lang = 'es-US'; // Idioma (es importante que coincida con la voz)

    // 3. Reproducimos el mensaje
    speechSynthesis.speak(utterance);
}




// Verificamos si los elementos de la vista de control existen en la página actual.
// Esto asegura que el código solo se ejecute cuando estamos en index.html.
if (llamarBtn && nombreInput && consultorioSelect) {
    // Función para realizar el llamado por voz utilizando la API SpeechSynthesisUtterance.
    // Esta función convierte un texto en voz.
    function llamarPorVoz(mensaje) {
        const utterance = new SpeechSynthesisUtterance(mensaje);
        utterance.lang = 'es-ES'; // Establece el idioma de la voz a español.
        window.speechSynthesis.speak(utterance); // Reproduce el mensaje de voz.
    }

    // Función para manejar el estado de los botones (habilitar/deshabilitar).
    // 'estado' true: Llamar deshabilitado, Cancelar/Atender habilitado.
    // 'estado' false: Llamar habilitado, Cancelar/Atender deshabilitado.
    function manejarBotones(estado) {
        llamarBtn.disabled = estado;       // Si estado es true, deshabilitar Llamar.
        cancelarBtn.disabled = !estado;    // Si estado es true, habilitar Cancelar.
        atenderBtn.disabled = !estado;     // Si estado es true, habilitar Atender.
    }
    
    // Al cargar la página de control, los botones "Cancelar" y "Atender" deben estar deshabilitados
    // porque no hay ningún turno en curso.
    manejarBotones(false);

    // Agregamos un 'event listener' al botón "Llamar".
    llamarBtn.addEventListener('click', () => {
        const nombre = nombreInput.value.trim(); // Obtenemos el nombre y eliminamos espacios extra.
        const consultorio = consultorioSelect.value; // Obtenemos el valor seleccionado del consultorio.
        // const sede = sedeSelect.value; // Obtenemos el valor seleccionado de la sede (comentado).

        // Verificamos si el campo de nombre está vacío.
        if (nombre === '') {
            alert('Por favor, ingrese el nombre del paciente.'); // Mensaje de alerta (considerar un modal UI para producción).
            return; // Detenemos la ejecución si el nombre está vacío.
        }

        // Creamos un objeto 'turno' con la información del llamado.
        // Date.now() genera un ID único basado en la marca de tiempo actual.
        turnoActual = {
            id: Date.now(),
            nombre: nombre,
            consultorio: consultorio,
            // sede: sede // La sede ha sido comentada temporalmente.
        };

        // Enviamos el objeto 'turno' a través del Broadcast Channel.
        // El 'type' 'nuevo_llamado' indica a otras pestañas que un nuevo turno ha sido llamado.
        channel.postMessage({
            type: 'nuevo_llamado',
            data: turnoActual
        });

        // Preparamos el mensaje para el llamado por voz.
        const mensajeVoz = ` Paciente ${nombre}, pasar al consultorio ${consultorio}.`;
        llamarPorVoz(mensajeVoz); // Realizamos el llamado por voz.

        // Deshabilitamos el botón "Llamar" y habilitamos "Cancelar" y "Atender"
        // para gestionar el turno actual.
        manejarBotones(true);
        nombreInput.value = ''; // Limpiamos el campo de nombre para el siguiente llamado.
    });

    // Agregamos un 'event listener' al botón "Cancelar".
    cancelarBtn.addEventListener('click', () => {
        // Solo procedemos si hay un turno actual en gestión.
        if (turnoActual) {
            // Enviamos un mensaje al Broadcast Channel para notificar la cancelación.
            channel.postMessage({
                type: 'cancelar_llamado',
                data: turnoActual.id // Enviamos solo el ID para identificar el turno a eliminar.
            });
            turnoActual = null; // Reseteamos el turno actual.
            manejarBotones(false); // Habilitamos "Llamar" y deshabilitamos los otros.
        }
    });

    // Agregamos un 'event listener' al botón "Atender".
    atenderBtn.addEventListener('click', () => {
        // Solo procedemos si hay un turno actual en gestión.
        if (turnoActual) {
            // Enviamos un mensaje al Broadcast Channel para notificar que el turno ha sido atendido.
            channel.postMessage({
                type: 'atender_llamado',
                data: turnoActual.id // Enviamos solo el ID para identificar el turno a eliminar.
            });
            turnoActual = null; // Reseteamos el turno actual.
            manejarBotones(false); // Habilitamos "Llamar" y deshabilitamos los otros.
        }
    });
}

// --- Código para la Vista de Visualización (pantalla.html) ---
// Obtenemos la referencia al contenedor donde se mostrará la lista de turnos.
const listaTurnos = document.getElementById('lista-turnos');

// Verificamos si el elemento de la vista de pantalla existe en la página actual.
// Esto asegura que el código solo se ejecute cuando estamos en pantalla.html.
if (listaTurnos) {
    // Función para crear y mostrar un nuevo elemento (fila) de turno en la lista.
    function mostrarTurno(turno) {
        const turnoElement = document.createElement('div');
        turnoElement.classList.add('turno-row'); // Añadimos la clase CSS para estilos de fila.
        turnoElement.id = `turno-${turno.id}`; // Asignamos un ID único para poder eliminarlo después.
        turnoElement.innerHTML = `
            <span class="paciente-nombre">${turno.nombre}</span>
            <span class="consultorio-numero">${turno.consultorio}</span>
        `;
        // Insertamos la nueva fila de turno justo después del encabezado de la lista.
        const header = listaTurnos.querySelector('.turno-header');
        if (header) { // Verificamos si el header existe antes de insertar.
             listaTurnos.insertBefore(turnoElement, header.nextSibling);
        } else {
             listaTurnos.prepend(turnoElement); // Si no hay encabezado, lo agregamos al principio.
        }
    }

    // Escuchamos los mensajes que llegan a través del Broadcast Channel.
    channel.addEventListener('message', (event) => {
        const { type, data } = event.data; // Desestructuramos el evento para obtener el tipo y los datos.

        if (type === 'nuevo_llamado') {
            // Si el mensaje es un nuevo llamado, mostramos el turno en la pantalla.
            mostrarTurno(data);
        } else if (type === 'cancelar_llamado' || type === 'atender_llamado') {
            // Si el mensaje es para cancelar o atender un turno, lo eliminamos de la pantalla.
            const turnoId = data; // El 'data' en este caso es el ID del turno a eliminar.
            const turnoElement = document.getElementById(`turno-${turnoId}`); // Buscamos el elemento por su ID.
            if (turnoElement) {
                turnoElement.remove(); // Eliminamos el elemento del DOM.
            }
        }
    });
}
