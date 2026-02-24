<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompetitionController;
use App\Http\Controllers\DogController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\TimeSlotController;
use App\Http\Controllers\RankingController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\NotificationController;
use Illuminate\Http\Request; // Added for the closure route

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/competitions/{id}', [CompetitionController::class, 'show']);

Route::get('/time-slots', [TimeSlotController::class, 'index']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    // The original /user route is kept, as the instruction's /user route was a closure and might conflict.
    // If the intent was to replace, it should be specified. Keeping original for minimal change.
    Route::get('/user', [AuthController::class, 'user']);
    Route::match(['put', 'post'], '/user/profile', [AuthController::class, 'updateProfile']);

    // Rutas protegidas por rol (admin, staff)
    Route::middleware(['role:admin,staff'])->group(function () {
        Route::get('/users', [AuthController::class, 'index']);
        Route::match(['put', 'post'], '/users/{id}/role', [AuthController::class, 'updateRole']);

        Route::post('/competitions', [CompetitionController::class, 'store']);
        Route::match(['put', 'post'], '/competitions/{id}', [CompetitionController::class, 'update']);
        Route::match(['delete', 'post'], '/competitions/{id}', [CompetitionController::class, 'destroy']);

        // Ranking moved to general authenticated routes

        // Attendance (Admin/Staff)
        Route::get('/admin/attendance/pending', [AttendanceController::class, 'pending']);
        Route::post('/admin/attendance/confirm', [AttendanceController::class, 'confirm']);

        // Reservations index moved to general authenticated routes

        Route::post('/time-slots', [TimeSlotController::class, 'store']);
        Route::match(['put', 'post'], '/time-slots/{id}', [TimeSlotController::class, 'update']);
        Route::match(['delete', 'post'], '/time-slots/{id}', [TimeSlotController::class, 'destroy']);

    });

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
        Route::match(['put', 'post'], '/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::match(['put', 'post'], '/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::match(['put', 'post'], '/dogs/{id}', [DogController::class, 'update']);
        Route::match(['delete', 'post'], '/dogs/{id}', [DogController::class, 'destroy']);
        Route::post('/dogs/{id}/photo', [DogController::class, 'uploadPhoto']);

        Route::get('/availability', [ReservationController::class, 'availability']); // ???

        Route::get('/reservations/my', [ReservationController::class, 'myReservations']); // Necesitaríamos este endpoint
        Route::post('/reservations', [ReservationController::class, 'store']); // ???
        Route::match(['delete', 'post'], '/reservations/block', [ReservationController::class, 'destroyBlock']); // ???
        Route::get('/reservations/{id}', [ReservationController::class, 'show']);
        Route::match(['put', 'post'], '/reservations/{id}', [ReservationController::class, 'update']); // Solo su propia reserva
        Route::match(['delete', 'post'], '/reservations/{id}', [ReservationController::class, 'destroy']); // Solo su propia reserva
    });



});