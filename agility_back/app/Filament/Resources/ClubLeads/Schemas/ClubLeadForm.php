<?php

namespace App\Filament\Resources\ClubLeads\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ClubLeadForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('slug')
                    ->required(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required(),
                TextInput::make('phone')
                    ->tel()
                    ->required(),
                TextInput::make('plan_selected')
                    ->required(),
                TextInput::make('status')
                    ->required()
                    ->default('pending'),
            ]);
    }
}
