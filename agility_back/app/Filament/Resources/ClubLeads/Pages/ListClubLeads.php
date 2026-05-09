<?php

namespace App\Filament\Resources\ClubLeads\Pages;

use App\Filament\Resources\ClubLeads\ClubLeadResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListClubLeads extends ListRecords
{
    protected static string $resource = ClubLeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
