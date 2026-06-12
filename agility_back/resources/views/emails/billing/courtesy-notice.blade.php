<x-mail::message>
# ¡Hola {{ $managerName }}!

Queremos darte las gracias por confiar en **Club Agility** desde el principio. Tu club, **{{ $club->name }}**, es uno de los primeros de la plataforma 🐾

Estamos activando el sistema de suscripciones y, como agradecimiento por haber estado con nosotros desde el inicio, **tu club mantiene el acceso completo sin coste durante un periodo de cortesía**. No tienes que hacer nada ahora mismo: todo sigue funcionando con normalidad.

@if ($deadline)
Para que el servicio continúe sin interrupciones, te pedimos que añadas un método de pago **antes del {{ $deadline->format('d/m/Y') }}**. A partir de esa fecha, el acceso del club quedará en pausa hasta que se active una suscripción.
@else
Para que el servicio continúe sin interrupciones, te pedimos que añadas un método de pago antes de que finalice el periodo de cortesía.
@endif

Puedes configurarlo en un par de minutos desde tu panel de facturación:

<x-mail::button :url="$billingUrl">
Activar mi suscripción
</x-mail::button>

Si tienes cualquier duda sobre los planes o necesitas ayuda con el proceso, responde a este correo y te echamos una mano.

Gracias por formar parte de Club Agility,<br>
El equipo de Club Agility
</x-mail::message>
