<?php

namespace App\Filament\Resources\ClubLeads\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;

class ClubLeadForm
{
    public static function configure(Form $form): Form
    {
        return $form
            ->schema([
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
