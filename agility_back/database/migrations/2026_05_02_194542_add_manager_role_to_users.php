<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'member', 'staff', 'manager', 'admin') DEFAULT 'user' NOT NULL");
            // If they had 'manager' previously set and we rollback, it might break, so we should map it in down() or just keep it simple.
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("UPDATE users SET role = 'staff' WHERE role = 'manager'");
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'member', 'staff', 'admin') DEFAULT 'user' NOT NULL");
        }
    }
};
