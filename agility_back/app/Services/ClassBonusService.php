<?php

namespace App\Services;

use App\Models\Club;
use App\Models\User;

/**
 * Bonos de clases: contador de clases disponibles por socio (sin caducidad),
 * gestionado desde Provisión de Fondos y opt-in del gestor
 * (settings.class_bonuses_enabled).
 *
 * Reglas:
 *  - Con la funcionalidad activa, cada inscripción de un SOCIO a una clase
 *    consume una clase del bono (una por perro/plaza) de forma atómica; sin
 *    saldo suficiente, la inscripción se bloquea.
 *  - Cada reserva marca bonus_consumed para poder devolver EXACTAMENTE lo
 *    consumido al cancelar (por el socio, por el staff, al anular la clase o
 *    al borrar el horario), aunque el gestor active/desactive la funcionalidad
 *    entre medias. El flag se limpia al devolver: nunca hay dobles devoluciones.
 *  - Con la funcionalidad desactivada las reservas no consumen bono.
 */
class ClassBonusService
{
    public const RESULT_CONSUMED = 'consumed';
    public const RESULT_INSUFFICIENT = 'insufficient';
    public const RESULT_NOT_APPLICABLE = 'not_applicable';

    /**
     * ¿Está activada la funcionalidad para el club en contexto?
     */
    public function enabledFor(?User $anyClubUser = null): bool
    {
        $club = null;
        if (app()->bound('active_club_id')) {
            $club = Club::find(app('active_club_id'));
        } elseif ($anyClubUser) {
            $club = $anyClubUser->club;
        }

        return $club && ($club->settings['class_bonuses_enabled'] ?? false) === true;
    }

    /**
     * Consume del bono del socio las clases de una inscripción (una por
     * perro/plaza). Decremento atómico condicionado al saldo para evitar
     * carreras. Solo aplica a usuarios con rol member y con el módulo activo.
     */
    public function consumeForBooking(?User $target, int $classes): string
    {
        if (!$target || $classes <= 0 || $target->role !== 'member' || !$this->enabledFor($target)) {
            return self::RESULT_NOT_APPLICABLE;
        }

        $updated = User::where('id', $target->id)
            ->where('class_bonus_balance', '>=', $classes)
            ->decrement('class_bonus_balance', $classes);

        return $updated > 0 ? self::RESULT_CONSUMED : self::RESULT_INSUFFICIENT;
    }

    /**
     * Devuelve al bono las clases consumidas por estas reservas y limpia el
     * flag bonus_consumed. Devuelve aunque la funcionalidad esté ahora
     * desactivada: si se consumió, se restituye.
     *
     * @param iterable<\App\Models\Reservation> $reservations
     */
    public function refund(iterable $reservations): void
    {
        $byUser = [];

        foreach ($reservations as $reservation) {
            if (!$reservation->bonus_consumed || !$reservation->user_id) {
                continue;
            }
            $byUser[$reservation->user_id] = ($byUser[$reservation->user_id] ?? 0) + 1;
            $reservation->bonus_consumed = false;
            $reservation->saveQuietly();
        }

        foreach ($byUser as $userId => $count) {
            User::where('id', $userId)->increment('class_bonus_balance', $count);
        }
    }
}
