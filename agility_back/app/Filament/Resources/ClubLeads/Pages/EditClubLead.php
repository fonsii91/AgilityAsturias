<?php

namespace App\Filament\Resources\ClubLeads\Pages;

use App\Filament\Resources\ClubLeads\ClubLeadResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;

class EditClubLead extends EditRecord
{
    protected static string $resource = ClubLeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}
