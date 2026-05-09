<?php

namespace App\Filament\Resources\ClubLeads\Pages;

use App\Filament\Resources\ClubLeads\ClubLeadResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewClubLead extends ViewRecord
{
    protected static string $resource = ClubLeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}
