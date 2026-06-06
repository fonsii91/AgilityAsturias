<x-mail::message>
# ¡Hola {{ $lead->name }}!

@if ($activationLink)
¡Tu espacio en **Club Agility** ya está completamente listo y disponible!

Hemos configurado tu espacio de administración con el subdominio **{{ $lead->slug }}.clubagility.com** y el plan **{{ $lead->plan_selected }}**.

Para empezar a gestionar tu club, haz clic en el siguiente botón para activar tu cuenta de administrador y configurar tu contraseña de acceso:

<x-mail::button :url="$activationLink">
Activar Cuenta y Establecer Contraseña
</x-mail::button>

Tu enlace de acceso diario será: [https://{{ $lead->slug }}.clubagility.com](https://{{ $lead->slug }}.clubagility.com)
@else
Hemos recibido correctamente tu solicitud de alta para el club en **Club Agility**.

Nuestro equipo ya se ha puesto manos a la obra para configurar tu espacio de administración con el subdominio
**{{ $lead->slug }}.clubagility.com** y el plan **{{ $lead->plan_selected }}**.

En breve te contactaremos a este correo electrónico con los datos de acceso para que puedas empezar a utilizar la
plataforma.
@endif

Gracias,<br>
El equipo de Club Agility
</x-mail::message>