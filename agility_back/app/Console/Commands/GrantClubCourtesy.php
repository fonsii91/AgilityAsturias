<?php

namespace App\Console\Commands;

use App\Mail\CourtesyPeriodNotice;
use App\Models\Club;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Concede un periodo de cortesía a clubes existentes para que no se bloqueen al
 * desactivar el bypass de suscripciones (migración escalonada a pago real).
 *
 * SOLO escribe la columna courtesy_until. Nunca borra ni modifica nada más.
 * Es idempotente: re-ejecutarlo vuelve a fijar la misma fecha sin efectos colaterales.
 */
class GrantClubCourtesy extends Command
{
    protected $signature = 'clubs:grant-courtesy
                            {--until= : Fecha límite del periodo de cortesía (YYYY-MM-DD). Por defecto, 2 meses desde hoy}
                            {--ids= : IDs de clubes separados por comas. Por defecto, todos los clubes sin suscripción activa}
                            {--send-email : Enviar también el correo de aviso al gestor de cada club}
                            {--force : No pedir confirmación}';

    protected $description = 'Asigna un periodo de cortesía (courtesy_until) a los clubes existentes para no bloquearlos al activar el cobro real';

    public function handle(): int
    {
        // 1. Resolver la fecha límite
        $until = $this->option('until')
            ? Carbon::parse($this->option('until'))->endOfDay()
            : Carbon::now()->addMonths(2)->endOfDay();

        // 2. Resolver los clubes objetivo
        if ($this->option('ids')) {
            $ids = collect(explode(',', $this->option('ids')))
                ->map(fn ($id) => (int) trim($id))
                ->filter()
                ->all();
            $clubs = Club::whereIn('id', $ids)->get();
        } else {
            // Por defecto: todos los clubes que NO tengan una suscripción de Stripe activa.
            // Los que ya pagan no necesitan cortesía.
            $clubs = Club::all()->filter(fn (Club $club) => !$club->subscribed('default'));
        }

        if ($clubs->isEmpty()) {
            $this->warn('No se encontraron clubes que cumplan el criterio. No se ha hecho ningún cambio.');
            return self::SUCCESS;
        }

        // 3. Mostrar lo que se va a hacer
        $this->info("Periodo de cortesía hasta: {$until->format('d/m/Y H:i')}");
        $this->table(
            ['ID', 'Slug', 'Nombre', 'courtesy_until actual', 'Gestor'],
            $clubs->map(function (Club $club) {
                $manager = $this->managerOf($club);
                return [
                    $club->id,
                    $club->slug,
                    $club->name,
                    $club->courtesy_until ? $club->courtesy_until->format('d/m/Y') : '—',
                    $manager ? $manager->email : 'SIN GESTOR',
                ];
            })->all()
        );

        if ($this->option('send-email')) {
            $this->warn('Se ENVIARÁ el correo de aviso a los gestores listados (clientes reales).');
        }

        if (!$this->option('force') && !$this->confirm("¿Aplicar el periodo de cortesía a {$clubs->count()} club(es)?")) {
            $this->info('Operación cancelada. No se ha hecho ningún cambio.');
            return self::SUCCESS;
        }

        // 4. Aplicar (solo escribe courtesy_until)
        $applied = 0;
        $emailed = 0;
        foreach ($clubs as $club) {
            $club->courtesy_until = $until;
            $club->save();
            $applied++;
            Log::info('Periodo de cortesía asignado', [
                'club_id' => $club->id,
                'slug' => $club->slug,
                'courtesy_until' => $until->toIso8601String(),
            ]);

            if ($this->option('send-email')) {
                $manager = $this->managerOf($club);
                if ($manager && $manager->email) {
                    Mail::to($manager->email)->send(new CourtesyPeriodNotice($club, $manager->name ?? $club->name));
                    $emailed++;
                } else {
                    $this->warn("Club {$club->slug}: sin gestor con email, correo no enviado.");
                }
            }
        }

        $this->newLine();
        $this->info("Listo. Cortesía aplicada a {$applied} club(es)" . ($this->option('send-email') ? ", correos enviados: {$emailed}." : '.'));

        return self::SUCCESS;
    }

    private function managerOf(Club $club): ?User
    {
        return User::where('club_id', $club->id)->where('role', 'manager')->first();
    }
}
