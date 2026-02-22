<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Competition;
use App\Notifications\NewEventNotification;
use Illuminate\Support\Facades\Notification;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $adminUser = clone $users->where('email', 'admin@agility.com')->first();

        $competitions = Competition::take(10)->get();

        if ($users->isEmpty() || $competitions->isEmpty()) {
            $this->command->info('No users or competitions found. Skipping Notification seeding.');
            return;
        }

        foreach ($competitions as $competition) {
            // This will send an array of notifications to all users, resulting in DB entries
            Notification::send($users, new NewEventNotification($competition));
            if ($adminUser && !$users->contains('id', $adminUser->id)) {
                Notification::send([$adminUser], new NewEventNotification($competition));
            }
        }

        // Mark half of the notifications as read for testing the UI states
        $users->each(function ($user) {
            $user->unreadNotifications->take(1)->markAsRead();
        });

        $this->command->info('Notifications seeded and some marked as read.');
    }
}
