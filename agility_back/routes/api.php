<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompetitionController;
use App\Http\Controllers\DogController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\TimeSlotController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/competitions/{id}', [CompetitionController::class, 'show']);

Route::get('/time-slots', [TimeSlotController::class, 'index']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);

    // Rutas protegidas por rol (admin, staff)
    Route::middleware(['role:admin,staff'])->group(function () {
        Route::get('/users', [AuthController::class, 'index']);
        Route::put('/users/{id}/role', [AuthController::class, 'updateRole']);

        Route::post('/competitions', [CompetitionController::class, 'store']);
        Route::put('/competitions/{id}', [CompetitionController::class, 'update']);
        Route::delete('/competitions/{id}', [CompetitionController::class, 'destroy']);

        Route::get('/reservations', [ReservationController::class, 'index']); // Ver todas las reservas

        Route::post('/time-slots', [TimeSlotController::class, 'store']);
        Route::put('/time-slots/{id}', [TimeSlotController::class, 'update']);
        Route::delete('/time-slots/{id}', [TimeSlotController::class, 'destroy']);
    });

    // Rutas para usuarios autenticados (cualquier rol)
    Route::get('/dogs', [DogController::class, 'index']);
    Route::post('/dogs', [DogController::class, 'store']);
    Route::get('/dogs/{id}', [DogController::class, 'show']);
    Route::put('/dogs/{id}', [DogController::class, 'update']);
    Route::delete('/dogs/{id}', [DogController::class, 'destroy']);

    Route::get('/availability', [ReservationController::class, 'availability']); // New endpoint for slot availability
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::get('/reservations/my', [ReservationController::class, 'myReservations']); // Necesitaríamos este endpoint
    Route::get('/reservations/{id}', [ReservationController::class, 'show']);
    Route::put('/reservations/{id}', [ReservationController::class, 'update']); // Solo su propia reserva (validar en controller)
    Route::delete('/reservations/{id}', [ReservationController::class, 'destroy']); // Solo su propia reserva
});