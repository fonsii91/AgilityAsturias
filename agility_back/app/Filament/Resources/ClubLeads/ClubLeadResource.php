<?php

namespace App\Filament\Resources\ClubLeads;

use App\Filament\Resources\ClubLeads\Pages\CreateClubLead;
use App\Filament\Resources\ClubLeads\Pages\EditClubLead;
use App\Filament\Resources\ClubLeads\Pages\ListClubLeads;
use App\Filament\Resources\ClubLeads\Pages\ViewClubLead;
use App\Filament\Resources\ClubLeads\Schemas\ClubLeadForm;
use App\Filament\Resources\ClubLeads\Schemas\ClubLeadInfolist;
use App\Filament\Resources\ClubLeads\Tables\ClubLeadsTable;
use App\Models\ClubLead;
use BackedEnum;
use Filament\Forms\Form;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables\Table;

class ClubLeadResource extends Resource
{
    protected static ?string $model = ClubLead::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Form $form): Form
    {
        return ClubLeadForm::configure($form);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return ClubLeadInfolist::configure($infolist);
    }

    public static function table(Table $table): Table
    {
        return ClubLeadsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListClubLeads::route('/'),
            'create' => CreateClubLead::route('/create'),
            'view' => ViewClubLead::route('/{record}'),
            'edit' => EditClubLead::route('/{record}/edit'),
        ];
    }
}
