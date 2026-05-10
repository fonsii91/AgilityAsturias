<x-mail::message>
# ¡Nuevo Club Lead!

Se acaba de recibir una nueva solicitud de alta de club a través de la web principal.

**Datos del Club:**
- **Nombre:** {{ $lead->name }}
- **Email:** {{ $lead->email }}
- **Teléfono:** {{ $lead->phone }}
- **Subdominio deseado:** {{ $lead->slug }}.clubagility.com
- **Plan seleccionado:** {{ $lead->plan_selected }}

Por favor, accede al panel de SuperAdmin para procesar esta solicitud.

<x-mail::button :url="'https://admin.clubagility.com/club-leads'">
Ver Leads en Panel Admin
</x-mail::button>

Saludos,<br>
El sistema
</x-mail::message>
