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
use App\Http\Controllers\VideoController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\RsceTrackController;
use App\Http\Controllers\RfecTrackController;
use App\Http\Controllers\PersonalEventController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/reset-password', [AuthController::class, 'resetPasswordWithToken']);
Route::post('/club-handoff', [AuthController::class, 'exchangeClubHandoff']);

Route::get('/tenant/info', [\App\Http\Controllers\ClubController::class, 'current']);
Route::get('/manifest.json', [\App\Http\Controllers\ClubController::class, 'manifest']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/competitions/{id}', [CompetitionController::class, 'show']);

Route::get('/gallery', [GalleryController::class, 'index']);
Route::get('/public-videos', [VideoController::class, 'publicIndex']);

Route::get('/time-slots', [TimeSlotController::class, 'index']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    // The original /user route is kept, as the instruction's /user route was a closure and might conflict.
    // If the intent was to replace, it should be specified. Keeping original for minimal change.
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);

    // Rutas protegidas por rol (admin, gestor, staff)
    Route::middleware(['role:admin,manager,staff'])->group(function () {
        Route::get('/users', [AuthController::class, 'index']);
        Route::post('/users/{id}/role', [AuthController::class, 'updateRole']);
        Route::post('/users/{id}/delete', [AuthController::class, 'destroy']);
        Route::post('/users/{id}/generate-reset-link', [AuthController::class, 'generateResetLink']);

        Route::post('/competitions', [CompetitionController::class, 'store']);
        Route::post('/competitions/{id}', [CompetitionController::class, 'update']);
        Route::post('/competitions/{id}/delete', [CompetitionController::class, 'destroy']);

        // Gallery
        Route::post('/gallery', [GalleryController::class, 'store']);
        Route::post('/gallery/{id}/delete', [GalleryController::class, 'destroy']);

        // Resources
        Route::post('/resources', [ResourceController::class, 'store']);
        Route::post('/resources/{id}', [ResourceController::class, 'update']);
        Route::post('/resources/{id}/delete', [ResourceController::class, 'destroy']);

        // Videos (Admin/Staff)
        Route::post('/videos/{id}/toggle-public-gallery', [VideoController::class, 'togglePublicGallery']);

        // Ranking moved to general authenticated routes

        // Attendance (Admin/Staff)
        Route::get('/admin/attendance/pending', [AttendanceController::class, 'pending']);
        Route::post('/admin/attendance/confirm', [AttendanceController::class, 'confirm']);
        Route::get('/admin/attendance/pending-competitions', [AttendanceController::class, 'pendingCompetitions']);
        Route::post('/admin/attendance/confirm-competition', [AttendanceController::class, 'confirmCompetition']);

        // Extra Points (Admin/Staff)
        Route::post('/dogs/{id}/extra-points', [DogController::class, 'giveExtraPoints']);

        // Reservations index moved to general authenticated routes

        Route::post('/time-slots', [TimeSlotController::class, 'store']);
        Route::post('/time-slots/{id}', [TimeSlotController::class, 'update']);
        Route::post('/time-slots/{id}/delete', [TimeSlotController::class, 'destroy']);

        // Time Slot Exceptions
        Route::post('/time-slot-exceptions', [\App\Http\Controllers\TimeSlotExceptionController::class, 'store']);
        Route::post('/time-slot-exceptions/delete', [\App\Http\Controllers\TimeSlotExceptionController::class, 'destroy']);
        
        // Announcements (Admin/Staff)
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);

        // Videos (Admin)
        Route::get('/admin/videos/stats', [VideoController::class, 'stats']);
        Route::get('/admin/videos/daily-history', [VideoController::class, 'dailyHistory']);
        Route::get('/admin/deleted-videos', [VideoController::class, 'deletedHistory']);
        Route::post('/admin/videos/{id}/retry', [VideoController::class, 'retryUpload']);

    });

    // Rutas protegidas EXCLUSIVAMENTE por rol admin
    Route::middleware(['role:admin'])->group(function () {
        // Resources (Admin)
        Route::put('/resources/{id}/toggle-global', [ResourceController::class, 'toggleGlobal']);
        // Dog Workloads Monitor
        Route::get('/admin/salud/monitor', [\App\Http\Controllers\DogWorkloadController::class, 'adminMonitorData']);
        // AI Avatars (Admin)
        Route::post('/admin/dogs/{id}/avatars', [DogController::class, 'updateAvatarsAdmin']);
        Route::post('/admin/dogs/{id}/generate-avatars', [DogController::class, 'generateAvatarsAdmin']);
        // RSCE / RFEC Monitor
        Route::get('/admin/rsce/monitor', [RsceTrackController::class, 'adminMonitorData']);
        Route::get('/admin/rfec/monitor', [RfecTrackController::class, 'adminMonitorData']);
        
        // Gestión de Clubes
        Route::get('/admin/clubs', [\App\Http\Controllers\ClubController::class, 'index']);
        Route::post('/admin/clubs', [\App\Http\Controllers\ClubController::class, 'store']);
        Route::post('/admin/clubs/{club}/handoff', [AuthController::class, 'createClubHandoff']);
        Route::delete('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'destroy']);

        // Suggestions (Admin)
        Route::get('/admin/suggestions', [SuggestionController::class, 'index']);
        Route::post('/admin/suggestions/{id}/resolve', [SuggestionController::class, 'resolve']);
        Route::post('/admin/suggestions/{id}/unresolve', [SuggestionController::class, 'unresolve']);
    });

    Route::middleware(['role:admin,manager'])->group(function () {
        Route::get('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'show']);
        Route::put('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'update']);
        Route::post('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'update']); // Some forms might send POST with _method
    });

    Route::middleware(['role:admin,manager,staff,member'])->group(function () {
        // Ranking
        Route::get('/ranking', [RankingController::class, 'index']);

        // Users for sharing
        Route::get('/users/minimal', [\App\Http\Controllers\AuthController::class, 'minimalIndex']);

        Route::get('/resources-test', [ResourceController::class, 'index']);

        // Resources
        Route::get('/resources', [ResourceController::class, 'index']);

        // Reservations
        Route::get('/reservations', [ReservationController::class, 'index']); // Ver todas o sus propias reservas

        Route::get('/dogs', [DogController::class, 'index']);
        Route::get('/dogs/all', [DogController::class, 'all']);
        Route::post('/dogs', [DogController::class, 'store']);
        Route::get('/dogs/{id}', [DogController::class, 'show']);
        Route::post('/dogs/{id}/share', [DogController::class, 'share']);
        Route::post('/dogs/{id}/unshare', [DogController::class, 'unshare']);
        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/dogs/{id}', [DogController::class, 'update']);
        Route::post('/dogs/{id}/delete', [DogController::class, 'destroy']);
        Route::post('/dogs/{id}/photo', [DogController::class, 'uploadPhoto']);

        // Workloads (Salud Deportiva ACWR)
        Route::get('/dogs/{dog}/workload', [\App\Http\Controllers\DogWorkloadController::class, 'getAcwrData']);
        Route::get('/dogs/{dog}/pending-reviews', [\App\Http\Controllers\DogWorkloadController::class, 'getPendingReviews']);
        Route::post('/dogs/{dog}/workloads', [\App\Http\Controllers\DogWorkloadController::class, 'store']);
        Route::post('/workloads/{workload}/confirm', [\App\Http\Controllers\DogWorkloadController::class, 'confirmWorkload']);
        Route::put('/workloads/{workload}', [\App\Http\Controllers\DogWorkloadController::class, 'update']);
        Route::delete('/workloads/{workload}', [\App\Http\Controllers\DogWorkloadController::class, 'destroy']);

        // Announcements
        Route::get('/announcements', [AnnouncementController::class, 'index']);
        Route::post('/announcements/{id}/read', [AnnouncementController::class, 'markAsRead']);

        // RSCE Tracks
        Route::get('/rsce-tracks', [RsceTrackController::class, 'index']);
        Route::post('/rsce-tracks', [RsceTrackController::class, 'store']);
        Route::post('/rsce-tracks/{rsceTrack}', [RsceTrackController::class, 'update']);
        Route::post('/rsce-tracks/{rsceTrack}/delete', [RsceTrackController::class, 'destroy']);

        // RFEC Tracks
        Route::get('/rfec-tracks', [RfecTrackController::class, 'index']);
        Route::post('/rfec-tracks', [RfecTrackController::class, 'store']);
        Route::post('/rfec-tracks/{rfecTrack}', [RfecTrackController::class, 'update']);
        Route::post('/rfec-tracks/{rfecTrack}/delete', [RfecTrackController::class, 'destroy']);

        Route::get('/availability', [ReservationController::class, 'availability']); // ???
        Route::get('/time-slot-exceptions', [\App\Http\Controllers\TimeSlotExceptionController::class, 'index']);

        Route::get('/reservations/my', [ReservationController::class, 'myReservations']); // Necesitaríamos este endpoint
        Route::post('/reservations', [ReservationController::class, 'store']); // ???
        Route::post('/reservations/block/delete', [ReservationController::class, 'destroyBlock']); // ???
        Route::get('/reservations/{id}', [ReservationController::class, 'show']);
        Route::post('/reservations/{id}', [ReservationController::class, 'update']); // Solo su propia reserva
        Route::post('/reservations/{id}/delete', [ReservationController::class, 'destroy']); // Solo su propia reserva

        // Suggestions
        Route::post('/suggestions', [SuggestionController::class, 'store']);

        Route::get('/videos', [VideoController::class, 'index']);
        Route::post('/videos', [VideoController::class, 'store']);
        Route::post('/videos/{id}', [VideoController::class, 'update']);
        Route::post('/videos/{id}/delete', [VideoController::class, 'destroy']);
        Route::post('/videos/{id}/toggle-like', [VideoController::class, 'toggleLike']);
        Route::get('/videos/{id}/download', [VideoController::class, 'download']);

        // Event Attendance
        Route::post('/competitions/{id}/attend', [CompetitionController::class, 'attend']);
        Route::post('/competitions/{id}/unattend', [CompetitionController::class, 'unattend']);
        Route::get('/competitions/{id}/attendees', [CompetitionController::class, 'getAttendees']);

        // Personal Events
        Route::get('/personal-events', [PersonalEventController::class, 'index']);
        Route::post('/personal-events', [PersonalEventController::class, 'store']);
        Route::put('/personal-events/{id}', [PersonalEventController::class, 'update']);
        Route::delete('/personal-events/{id}', [PersonalEventController::class, 'destroy']);

    });



});
