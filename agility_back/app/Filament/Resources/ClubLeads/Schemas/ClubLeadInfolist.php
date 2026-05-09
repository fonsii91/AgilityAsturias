<?php

namespace App\Filament\Resources\ClubLeads\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Infolist;

class ClubLeadInfolist
{
    public static function configure(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                TextEntry::make('name'),
                TextEntry::make('slug'),
                TextEntry::make('email')
                    ->label('Email address'),
                TextEntry::make('phone'),
                TextEntry::make('plan_selected'),
                TextEntry::make('status'),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}
