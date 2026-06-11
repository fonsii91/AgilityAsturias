<x-mail::message>
# Hola {{ $user->name }},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en **Club Agility**.

Haz clic en el siguiente botón para elegir una contraseña nueva:

<x-mail::button :url="$resetLink">
Restablecer Contraseña
</x-mail::button>

Este enlace caduca en **60 minutos** y solo puede usarse una vez.

Si tú no has solicitado el cambio, puedes ignorar este correo: tu contraseña actual seguirá funcionando.

Gracias,<br>
El equipo de Club Agility
</x-mail::message>
