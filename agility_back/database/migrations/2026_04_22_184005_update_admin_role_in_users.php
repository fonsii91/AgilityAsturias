<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Solo permitimos admin, no super_admin
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'member', 'staff', 'admin') DEFAULT 'user' NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'member', 'staff', 'admin') DEFAULT 'user' NOT NULL");
    }
};
