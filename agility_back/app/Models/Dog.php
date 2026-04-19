<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dog extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'breed',
        'birth_date',
        'rsce_license',
        'rsce_expiration_date',
        'rsce_grade',
        'rsce_category',
        'rfec_license',
        'rfec_expiration_date',
        'microchip',
        'pedigree',
        'photo_url',
        'points',
        'has_previous_injuries',
        'sterilized_at',
        'weight_kg',
        'height_cm',
    ];

    protected $casts = [
        'rsce_license' => 'encrypted',
        'rsce_expiration_date' => 'encrypted',
        'rfec_license' => 'encrypted',
        'rfec_expiration_date' => 'encrypted',
        'microchip' => 'encrypted',
        'pedigree' => 'encrypted',
        'has_previous_injuries' => 'boolean',
        'weight_kg' => 'decimal:2',
        'height_cm' => 'decimal:2',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class)->withPivot('is_primary_owner');
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function competitions()
    {
        return $this->belongsToMany(Competition::class);
    }

    public function videos()
    {
        return $this->hasMany(Video::class);
    }

    public function pointHistories()
    {
        return $this->hasMany(PointHistory::class);
    }

    public function rsceTracks()
    {
        return $this->hasMany(RsceTrack::class);
    }

    public function workloads()
    {
        return $this->hasMany(DogWorkload::class);
    }

    /**
     * Override toArray to ensure private data is only exposed to the owners.
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        $userId = auth()->id();
        $isOwner = false;

        if ($userId) {
            if ($this->relationLoaded('users')) {
                $isOwner = $this->users->contains('id', $userId);
            } else {
                $isOwner = \Illuminate\Support\Facades\DB::table('dog_user')
                            ->where('dog_id', $this->id)
                            ->where('user_id', $userId)
                            ->exists();
            }
        }

        if (!$isOwner) {
            unset($array['microchip']);
            unset($array['pedigree']);
            unset($array['rsce_license']);
            unset($array['rsce_expiration_date']);
            unset($array['rfec_license']);
            unset($array['rfec_expiration_date']);
        }

        return $array;
    }

    /**
     * Motor de cálculo ACWR centralizado.
     */
    public function calculateAcwrData()
    {
        $now = \Carbon\Carbon::now();
        $sevenDaysAgo = $now->copy()->subDays(7);
        $twentyEightDaysAgo = $now->copy()->subDays(28);

        // Fetch workloads for the last 28 days that are confirmed
        // Se eager load si no están previamente cargadas para evitar N+1 si procesamos multiples perros
        $workloads = $this->workloads()
            ->where('status', 'confirmed')
            ->where('date', '>=', $twentyEightDaysAgo)
            ->get();

        $acuteLoad = 0;
        $total28DaysLoad = 0;

        foreach ($workloads as $workload) {
            $load = $workload->duration_min * $workload->intensity_rpe;
            
            // Multiplicador de riesgo: Saltar a Máxima Altura (Aumento del 20% de la carga percibida)
            if ($workload->jumped_max_height) {
                $load *= 1.2;
            }
            
            // Multiplicador de riesgo: Altas mangas en competición o entrenamiento
            if ($workload->number_of_runs) {
                if ($workload->number_of_runs >= 6) {
                    $load *= 1.6; // +60% de fatiga para maratones de pistas (+5)
                } else if ($workload->number_of_runs >= 3) {
                    $load *= 1.3; // +30% de fatiga estructural para 3-5 mangas
                }
            }

            $total28DaysLoad += $load;

            if (\Carbon\Carbon::parse($workload->date)->gte($sevenDaysAgo)) {
                $acuteLoad += $load;
            }
        }

        // --- CORRECCIÓN DE ONBOARDING (COLD START) ---
        $firstWorkloadDate = $this->workloads()->where('status', 'confirmed')->orderBy('date', 'asc')->value('date');
        $activeWeeks = 4;
        
        if ($firstWorkloadDate) {
            $daysSinceFirst = \Carbon\Carbon::parse($firstWorkloadDate)->diffInDays($now) + 1;
            if ($daysSinceFirst < 28) {
                $activeWeeks = max(1, ceil($daysSinceFirst / 7));
            }
        }

        $chronicLoad = $total28DaysLoad / $activeWeeks;
        
        $acwr = 0;
        if ($chronicLoad > 0) {
            $acwr = round($acuteLoad / $chronicLoad, 2);
        } else if ($acuteLoad > 0) {
            $acwr = 1.5; // Artificial spike if starting from zero and sudden work
        }

        // --- CÁLCULO DE UMBRALES DE RIESGO CLÍNICO ---
        $yellowThreshold = 1.30;
        $redThreshold = 1.50;

        // Penalización por Historial de Lesiones
        if ($this->has_previous_injuries) {
            $yellowThreshold = 1.15;
            $redThreshold = 1.35;
        }

        // Penalización por sobrepeso relativo
        if ($this->weight_kg && $this->height_cm) {
            $ratio = $this->height_cm / $this->weight_kg;
            if ($ratio < 2.5) {
               $redThreshold -= 0.10;
            }
        }

        $calibrationDays = isset($daysSinceFirst) ? $daysSinceFirst : 0;
        $isCalibrating = $calibrationDays < 14;

        // Determine Status Color
        $statusColor = 'none';
        if ($isCalibrating) {
            $statusColor = 'gray';
        } else {
            if ($acwr < 0.8) {
                $statusColor = 'blue'; // Desentrenamiento
            } else if ($acwr >= 0.8 && $acwr < $yellowThreshold) {
                $statusColor = 'green'; // Óptimo
            } else if ($acwr >= $yellowThreshold && $acwr < $redThreshold) {
                $statusColor = 'yellow'; // Precaución
            } else {
                $statusColor = 'red'; // Peligro
            }
        }

        return [
            'acwr' => $acwr,
            'acute_load' => $acuteLoad,
            'chronic_load' => $chronicLoad,
            'yellow_threshold' => $yellowThreshold,
            'red_threshold' => $redThreshold,
            'calibration_days' => $calibrationDays,
            'is_calibrating' => $isCalibrating,
            'recent_history' => $workloads,
            'status_color' => $statusColor
        ];
    }
}
