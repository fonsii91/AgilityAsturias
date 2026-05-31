<?php

namespace App\Jobs;

use App\Models\Competition;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class ScrapeCompetitionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * El número de segundos que el trabajo puede ejecutarse antes de expirar.
     *
     * @var int
     */
    public $timeout = 1800; // 30 minutos

    protected $competitionId;

    /**
     * Crea una nueva instancia de trabajo.
     */
    public function __construct($competitionId)
    {
        $this->competitionId = $competitionId;
    }

    /**
     * Ejecuta el trabajo.
     */
    public function handle(): void
    {
        $competition = Competition::find($this->competitionId);
        if (!$competition) {
            return;
        }

        try {
            // Ejecutar el comando de consola Artisan de forma síncrona dentro del Worker
            Artisan::call('flowagility:scrape', [
                '--competition_id' => $competition->id,
                '--force' => true
            ]);
        } catch (\Throwable $e) {
            // En caso de excepción, marcar la competición como fallida y guardar el error
            $competition->scrape_status = 'failed';
            $competition->scrape_error = $e->getMessage();
            $competition->save();
            
            Log::error("Error en ScrapeCompetitionJob para competición {$this->competitionId}: " . $e->getMessage());
            throw $e;
        }
    }
}
