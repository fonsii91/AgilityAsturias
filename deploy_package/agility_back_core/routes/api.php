<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompetitionController;
use App\Http\Controllers\DogController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\TimeSlotController;
use App\Http\Controllers\RankingController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\GalleryController;
use Illuminate\Http\Request; // Added for the closure route

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/reset-password', [AuthController::class, 'resetPasswordWithToken']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/competitions/{id}', [CompetitionController::class, 'show']);

Route::get('/gallery', [GalleryController::class, 'index']);

Route::get('/time-slots', [TimeSlotController::class, 'index']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    // The original /user route is kept, as the instruction's /user route was a closure and might conflict.
    // If the intent was to replace, it should be specified. Keeping original for minimal change.
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);

    // Rutas protegidas por rol (admin, staff)
    Route::middleware(['role:admin,staff'])->group(function () {
        Route::get('/users', [AuthController::class, 'index']);
        Route::post('/users/{id}/role', [AuthController::class, 'updateRole']);
        Route::post('/users/{id}/generate-reset-link', [AuthController::class, 'generateResetLink']);

        Route::post('/competitions', [CompetitionController::class, 'store']);
        Route::post('/competitions/{id}', [CompetitionController::class, 'update']);
        Route::post('/competitions/{id}/delete', [CompetitionController::class, 'destroy']);

        // Gallery
        Route::post('/gallery', [GalleryController::class, 'store']);
        Route::post('/gallery/{id}/delete', [GalleryController::class, 'destroy']);

        // Ranking moved to general authenticated routes

        // Attendance (Admin/Staff)
        Route::get('/admin/attendance/pending', [AttendanceController::class, 'pending']);
        Route::post('/admin/attendance/confirm', [AttendanceController::class, 'confirm']);

        // Reservations index moved to general authenticated routes

        Route::post('/time-slots', [TimeSlotController::class, 'store']);
        Route::post('/time-slots/{id}', [TimeSlotController::class, 'update']);
        Route::post('/time-slots/{id}/delete', [TimeSlotController::class, 'destroy']);

    });

    // Event Attendance
    Route::post('/competitions/{id}/attend', [CompetitionController::class, 'attend']);
    Route::post('/competitions/{id}/unattend', [CompetitionController::class, 'unattend']);
    Route::get('/competitions/{id}/attendees', [CompetitionController::class, 'getAttendees']);

    Route::middleware(['role:admin,staff,member'])->group(function () {
        // Ranking
        Route::get('/ranking', [RankingController::class, 'index']);

        // Reservations
        Route::get('/reservations', [ReservationController::class, 'index']); // Ver todas o sus propias reservas

        Route::get('/dogs', [DogController::class, 'index']);
        Route::post('/dogs', [DogController::class, 'store']);
        Route::get('/dogs/{id}', [DogController::class, 'show']);
        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/dogs/{id}', [DogController::class, 'update']);
        Route::post('/dogs/{id}/delete', [DogController::class, 'destroy']);
        Route::post('/dogs/{id}/photo', [DogController::class, 'uploadPhoto']);

        Route::get('/availability', [ReservationController::class, 'availability']); // ???

        Route::get('/reservations/my', [ReservationController::class, 'myReservations']); // Necesitaríamos este endpoint
        Route::post('/reservations', [ReservationController::class, 'store']); // ???
        Route::post('/reservations/block/delete', [ReservationController::class, 'destroyBlock']); // ???
        Route::get('/reservations/{id}', [ReservationController::class, 'show']);
        Route::post('/reservations/{id}', [ReservationController::class, 'update']); // Solo su propia reserva
        Route::post('/reservations/{id}/delete', [ReservationController::class, 'destroy']); // Solo su propia reserva
    });



});