<x-mail::message>
# ¡Hola {{ $lead->name }}!

Hemos recibido correctamente tu solicitud de alta para el club en **Club Agility**. 

Nuestro equipo ya se ha puesto manos a la obra para configurar tu espacio de administración con el subdominio **{{ $lead->slug }}.clubagility.com** y el plan **{{ $lead->plan_selected }}**.

En breve te contactaremos a este correo electrónico con los datos de acceso para que puedas empezar a utilizar la plataforma.

Si tienes alguna duda mientras tanto, puedes responder a este mismo correo.

Gracias,<br>
El equipo de Club Agility
</x-mail::message>
