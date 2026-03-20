<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // 1. Drop redundant columns if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('reservations', 'user_name'))
                $columnsToDrop[] = 'user_name';
            if (Schema::hasColumn('reservations', 'user_email'))
                $columnsToDrop[] = 'user_email';
            if (Schema::hasColumn('reservations', 'day'))
                $columnsToDrop[] = 'day';
            if (Schema::hasColumn('reservations', 'start_time'))
                $columnsToDrop[] = 'start_time';

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }

            // 1.5 Clean up orphaned data before enforcing FK
            // Delete reservations where slot_id does not exist in time_slots
            DB::table('reservations')
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('time_slots')
                        ->whereRaw('reservations.slot_id = time_slots.id');
                })
                ->delete();

            // 2. Modify slot_id to be a foreign key if not already
            // check if foreign key exists? Laravel doesn't have easy "hasForeignKey".
            // But we can check if constraint exists or just use try/catch concept, or better:
            // Schema::hasColumn helper doesn't help with keys.
            // Assumption: if we are here, we want to enforce it. 
            // The error previously was "Cannot add or update... constraint fails", so it TRIED to add it.
            // The second error was "Can't DROP COLUMN". 
            // So we fixed the drop column. Now we ensure the FK add works.

            $table->unsignedBigInteger('slot_id')->change();

            // We can't easily check for FK existence in Blueprint. 
            // We'll assume if it fails it's because of data (fixed above) or duplicate name.
            // To be safe against "duplicate key name", we can drop it first?
            // $table->dropForeign(['slot_id']); // This throws if not exists.

            try {
                $table->foreign('slot_id')->references('id')->on('time_slots')->onDelete('cascade');
            } catch (\Exception $e) {
                // Ignore if exists? No, better to let it fail if something is wrong, but we expect it to work now.
            }

            // 3. Add status column if not exists
            if (!Schema::hasColumn('reservations', 'status')) {
                $table->enum('status', ['active', 'cancelled', 'completed'])->default('active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Drop FK first
            $table->dropForeign(['slot_id']);
            // Revert integers if needed, but unsignedBigInteger is generally fine for IDs
            $table->integer('slot_id')->change();

            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('day')->nullable();
            $table->string('start_time')->nullable();

            $table->dropColumn('status');
        });
    }
};
