<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\GlobalFlowagilityEvent;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Log;

class ScrapeFlowagilityCalendar extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'flowagility:scrape-calendar';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape upcoming events calendar from FlowAgility and update global_flowagility_events';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting FlowAgility calendar scraper...");
        Log::info("Starting FlowAgility calendar scraper...");

        $output = '';

        if (app()->environment('testing') && config('app.fake_calendar_scraper_output')) {
            $output = config('app.fake_calendar_scraper_output');
            $this->info("Bypassing scraper process and using fake calendar output (testing mode).");
        } else {
            $process = new Process(['node', base_path('flowagility_calendar_scraper.cjs')]);
            
            // Pass PLAYWRIGHT_BROWSERS_PATH environment variable if defined
            $process->setEnv([
                'PLAYWRIGHT_BROWSERS_PATH' => env('PLAYWRIGHT_BROWSERS_PATH', '/opt/playwright-browsers'),
            ]);

            $process->setTimeout(300); // 5 minutes timeout

            $process->run(function ($type, $buffer) use (&$output) {
                $output .= $buffer;
                $this->output->write($buffer);
            });

            if (!$process->isSuccessful()) {
                $error = "FlowAgility calendar scraper process failed: " . $process->getErrorOutput();
                $this->error($error);
                Log::error($error);
                return 1;
            }
        }

        $this->info("\nScraper process finished successfully. Processing output...");

        $jsonStr = '';
        foreach (explode("\n", $output) as $line) {
            if (str_starts_with(trim($line), 'RESULT_JSON:')) {
                $jsonStr = substr(trim($line), 12);
                break;
            }
        }

        if (empty($jsonStr)) {
            $error = "No RESULT_JSON line found in the scraper output.";
            $this->error($error);
            Log::error($error);
            return 1;
        }

        $events = json_decode($jsonStr, true);
        if (!is_array($events)) {
            $error = "Failed to parse JSON from scraper output: " . json_last_error_msg();
            $this->error($error);
            Log::error($error);
            return 1;
        }

        $this->info("Found " . count($events) . " events in calendar. Filtering for RSCE or RFEC federations...");
        
        $upsertedCount = 0;
        foreach ($events as $event) {
            $fed = $event['federacion_str'] ?? '';
            
            // Check if federation matches RSCE or RFEC (case-insensitive)
            if (stripos($fed, 'RSCE') !== false || stripos($fed, 'RFEC') !== false) {
                if (empty($event['fecha_evento'])) {
                    $this->warn("Skipping event {$event['nombre']} (UUID: {$event['uuid']}) due to missing fecha_evento.");
                    continue;
                }

                GlobalFlowagilityEvent::updateOrCreate(
                    ['uuid' => $event['uuid']],
                    [
                        'nombre' => $event['nombre'],
                        'lugar' => $event['lugar'] ?? null,
                        'fecha_evento' => $event['fecha_evento'],
                        'fecha_fin_evento' => $event['fecha_fin_evento'] ?? null,
                        'fecha_limite' => $event['fecha_limite'] ?? null,
                        'enlace' => $event['enlace'],
                        'federacion' => $fed ?: null,
                        'organizador' => $event['organizador'] ?? null,
                    ]
                );
                $upsertedCount++;
            }
        }

        $msg = "Scraping completed. Upserted {$upsertedCount} RSCE/RFEC events into database.";
        $this->info($msg);
        Log::info($msg);

        return 0;
    }
}
