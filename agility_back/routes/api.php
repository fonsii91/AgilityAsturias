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
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\RsceTrackController;
use App\Http\Controllers\RfecTrackController;
use App\Http\Controllers\PersonalEventController;
use App\Http\Controllers\LigaNorteController;
use App\Http\Controllers\BountyController;
use App\Http\Controllers\SponsorController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/club-leads', [\App\Http\Controllers\ClubLeadController::class, 'store']);
Route::get('/club-leads/status/{slug}', [\App\Http\Controllers\ClubLeadController::class, 'checkSslStatus']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/reset-password', [AuthController::class, 'resetPasswordWithToken'])->middleware('throttle:10,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/club-handoff', [AuthController::class, 'exchangeClubHandoff']);

Route::get('/tenant/info', [\App\Http\Controllers\ClubController::class, 'current']);
Route::get('/manifest.json', [\App\Http\Controllers\ClubController::class, 'manifest']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/competitions/{id}', [CompetitionController::class, 'show']);

Route::get('/gallery', [GalleryController::class, 'index']);
Route::get('/sponsors', [SponsorController::class, 'index']);
Route::get('/public-videos', [VideoController::class, 'publicIndex']);
Route::post('/webhooks/bitmovin', [VideoController::class, 'webhook']);
Route::post('/webhooks/bunny', [VideoController::class, 'bunnyWebhook']);
Route::post('/webhooks/stripe', [\Laravel\Cashier\Http\Controllers\WebhookController::class, 'handleWebhook']);
Route::get('/videos/{id}/stream/{file}', [VideoController::class, 'streamProxy'])->where('file', '.*');

Route::get('/time-slots', [TimeSlotController::class, 'index']);
Route::get('/plans-public', [\App\Http\Controllers\SubscriptionAdminController::class, 'getPlans']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    // The original /user route is kept, as the instruction's /user route was a closure and might conflict.
    // If the intent was to replace, it should be specified. Keeping original for minimal change.
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);

    // Rutas de Facturación y Suscripción (exentas de bloqueo por suscripción inactiva)
    Route::post('/billing/checkout', [\App\Http\Controllers\BillingController::class, 'checkout']);
    Route::post('/billing/sync-checkout', [\App\Http\Controllers\BillingController::class, 'syncCheckoutSession']);
    Route::post('/billing/portal', [\App\Http\Controllers\BillingController::class, 'portal']);
    Route::get('/billing/status', [\App\Http\Controllers\BillingController::class, 'status']);
    Route::get('/billing/invoices', [\App\Http\Controllers\BillingController::class, 'invoices']);
    Route::get('/billing/invoices/{invoice}/download', [\App\Http\Controllers\BillingController::class, 'downloadInvoice'])->name('billing.invoice-download');

    // Resto de rutas protegidas por suscripción activa
    Route::middleware(['subscription.active'])->group(function () {
        // Rutas protegidas por rol (admin, gestor, staff)
        Route::middleware(['role:admin,manager,staff'])->group(function () {
        Route::get('/users', [AuthController::class, 'index']);
        Route::post('/users/{id}/role', [AuthController::class, 'updateRole']);
        Route::post('/users/{id}/delete', [AuthController::class, 'destroy']);
        Route::post('/users/{id}/generate-reset-link', [AuthController::class, 'generateResetLink']);
        Route::post('/users/generate-invite-link', [AuthController::class, 'generateInviteLink']);

        Route::post('/competitions', [CompetitionController::class, 'store']);
        Route::post('/competitions/{id}', [CompetitionController::class, 'update']);
        Route::post('/competitions/{id}/delete', [CompetitionController::class, 'destroy']);
        Route::get('/admin/scraper/global-events', [CompetitionController::class, 'globalEvents']);
        Route::get('/admin/scraper/detect-event', [CompetitionController::class, 'detectEvent']);


        // Gallery
        Route::post('/gallery', [GalleryController::class, 'store']);
        Route::post('/gallery/{id}/delete', [GalleryController::class, 'destroy']);

        // Sponsors
        Route::post('/sponsors', [SponsorController::class, 'store']);
        Route::post('/sponsors/{id}', [SponsorController::class, 'update']);
        Route::post('/sponsors/{id}/delete', [SponsorController::class, 'destroy']);

        // Resources
        Route::post('/resources', [ResourceController::class, 'store']);
        Route::post('/resources/{id}', [ResourceController::class, 'update']);
        Route::post('/resources/{id}/delete', [ResourceController::class, 'destroy']);
        Route::put('/resources/{id}/toggle-hide-for-club', [ResourceController::class, 'toggleHideForClub']);

        // Videos (Admin/Staff)
        Route::post('/videos/{id}/toggle-public-gallery', [VideoController::class, 'togglePublicGallery']);

        // Ranking moved to general authenticated routes

        // Attendance (Admin/Staff)
        Route::get('/admin/attendance/pending', [AttendanceController::class, 'pending']);
        Route::post('/admin/attendance/confirm', [AttendanceController::class, 'confirm']);
        Route::get('/admin/attendance/pending-competitions', [AttendanceController::class, 'pendingCompetitions']);
        Route::post('/admin/attendance/confirm-competition', [AttendanceController::class, 'confirmCompetition']);
        Route::get('/staff/attendance-stats', [AttendanceController::class, 'historyStats']);
        Route::get('/staff/attendance-stats/member/{userId}', [AttendanceController::class, 'historyStatsByMember']);

        // Seasons (Admin/Staff)
        Route::get('/admin/seasons', [\App\Http\Controllers\SeasonController::class, 'index']);

        // Extra Points (Admin/Staff)
        Route::post('/dogs/{id}/extra-points', [DogController::class, 'giveExtraPoints'])->middleware('gamification.enabled');

        // Reservations index moved to general authenticated routes

        Route::post('/time-slots', [TimeSlotController::class, 'store']);
        Route::post('/time-slots/{id}', [TimeSlotController::class, 'update']);
        Route::post('/time-slots/{id}/delete', [TimeSlotController::class, 'destroy']);

        // Pistas de entrenamiento (lectura: staff necesita la lista al asignar horarios)
        Route::get('/training-tracks', [\App\Http\Controllers\TrainingTrackController::class, 'index']);

        // Bonos de clases (staff añade clases al contador del socio; opt-in del gestor)
        Route::middleware(['class_bonuses.enabled'])->group(function () {
            Route::post('/class-bonuses/{id}/add', [\App\Http\Controllers\ClassBonusController::class, 'add']);
        });

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

        // Liga Norte
        Route::middleware(['liga_norte.enabled'])->group(function () {
            Route::get('/admin/liga-norte/imports', [LigaNorteController::class, 'listImports']);
            Route::post('/admin/liga-norte/imports/{id}/process', [LigaNorteController::class, 'processImport']);
            Route::post('/admin/liga-norte/imports/{id}/approve', [LigaNorteController::class, 'approveImport']);
            Route::post('/admin/liga-norte/imports/{id}/delete', [LigaNorteController::class, 'deleteImport']);
        });

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

        // Gestión de Solicitudes de Alta (Leads)
        Route::get('/admin/club-leads', [\App\Http\Controllers\ClubLeadController::class, 'index']);
        Route::put('/admin/club-leads/{id}/status', [\App\Http\Controllers\ClubLeadController::class, 'updateStatus']);
        Route::delete('/admin/club-leads/{id}', [\App\Http\Controllers\ClubLeadController::class, 'destroy']);

        // Suggestions (Admin)
        Route::get('/admin/suggestions', [SuggestionController::class, 'index']);
        Route::post('/admin/suggestions/{id}/resolve', [SuggestionController::class, 'resolve']);
        Route::post('/admin/suggestions/{id}/unresolve', [SuggestionController::class, 'unresolve']);
        // Subscriptions & Features (Admin)
        Route::get('/admin/plans', [\App\Http\Controllers\SubscriptionAdminController::class, 'getPlans']);
        Route::get('/admin/features', [\App\Http\Controllers\SubscriptionAdminController::class, 'getFeatures']);
        Route::post('/admin/plans', [\App\Http\Controllers\SubscriptionAdminController::class, 'createPlan']);
        Route::put('/admin/plans/{plan}', [\App\Http\Controllers\SubscriptionAdminController::class, 'updatePlan']);
        Route::put('/admin/plans/{plan}/features', [\App\Http\Controllers\SubscriptionAdminController::class, 'syncFeatures']);
        Route::put('/admin/clubs/{club}/plan', [\App\Http\Controllers\SubscriptionAdminController::class, 'assignPlanToClub']);
        Route::put('/admin/clubs/{club}/courtesy', [\App\Http\Controllers\SubscriptionAdminController::class, 'setClubCourtesy']);

        // Scraper Monitor (Admin)
        Route::get('/admin/scraper/status', [CompetitionController::class, 'adminScraperStatus']);
        Route::post('/admin/scraper/run', [CompetitionController::class, 'adminScraperRun']);
        Route::post('/admin/scraper/run-calendar', [CompetitionController::class, 'adminScraperRunCalendar']);
        Route::get('/admin/scraper/last-tracks', [CompetitionController::class, 'adminScraperLastTracks']);
    });

    Route::middleware(['role:admin,manager'])->group(function () {
        Route::middleware(['gamification.enabled'])->group(function () {
            // Seasons Management (Admin & Manager)
            Route::post('/admin/seasons/start', [\App\Http\Controllers\SeasonController::class, 'start']);
            Route::post('/admin/seasons/end', [\App\Http\Controllers\SeasonController::class, 'endCurrent']);
            Route::put('/admin/seasons/{id}', [\App\Http\Controllers\SeasonController::class, 'update']);
            Route::delete('/admin/seasons/{id}', [\App\Http\Controllers\SeasonController::class, 'destroy']);
            Route::post('/admin/seasons/{id}/reopen', [\App\Http\Controllers\SeasonController::class, 'reopen']);
        });

        // Pistas de entrenamiento (CRUD del gestor del club)
        Route::post('/training-tracks', [\App\Http\Controllers\TrainingTrackController::class, 'store']);
        Route::post('/training-tracks/{id}', [\App\Http\Controllers\TrainingTrackController::class, 'update']);
        Route::post('/training-tracks/{id}/delete', [\App\Http\Controllers\TrainingTrackController::class, 'destroy']);

        Route::get('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'show']);
        Route::put('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'update']);
        Route::post('/admin/clubs/{club}', [\App\Http\Controllers\ClubController::class, 'update']); // Some forms might send POST with _method
        Route::post('/admin/clubs/{club}/clear-demo', [\App\Http\Controllers\ClubController::class, 'clearDemoData']);
    });

    Route::middleware(['role:admin,manager,staff,member'])->group(function () {
        // Onboarding
        Route::get('/user/onboarding', [\App\Http\Controllers\OnboardingController::class, 'getProgress']);
        Route::get('/user/onboarding/challenge', [\App\Http\Controllers\OnboardingController::class, 'challenge']);
        Route::post('/user/onboarding/step', [\App\Http\Controllers\OnboardingController::class, 'updateStep']);
        Route::post('/user/onboarding/tutorial-finish', [\App\Http\Controllers\OnboardingController::class, 'finishTutorial']);



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

        // RSCE Tracks (bloqueadas si el gestor desactiva la bitácora en Funcionalidades)
        Route::middleware(['rsce_tracker.enabled'])->group(function () {
            Route::get('/rsce-tracks', [RsceTrackController::class, 'index']);
            Route::post('/rsce-tracks', [RsceTrackController::class, 'store']);
            Route::post('/rsce-tracks/{rsceTrack}', [RsceTrackController::class, 'update']);
            Route::post('/rsce-tracks/{rsceTrack}/delete', [RsceTrackController::class, 'destroy']);
        });

        // RFEC Tracks (idem con la bitácora de Caza)
        Route::middleware(['rfec_tracker.enabled'])->group(function () {
            Route::get('/rfec-tracks', [RfecTrackController::class, 'index']);
            Route::post('/rfec-tracks', [RfecTrackController::class, 'store']);
            Route::post('/rfec-tracks/{rfecTrack}', [RfecTrackController::class, 'update']);
            Route::post('/rfec-tracks/{rfecTrack}/delete', [RfecTrackController::class, 'destroy']);
        });

        Route::get('/availability', [ReservationController::class, 'availability']); // ???
        Route::get('/time-slot-exceptions', [\App\Http\Controllers\TimeSlotExceptionController::class, 'index']);

        // Reserva individual de pistas (entrenamientos libres, módulo opt-in)
        Route::middleware(['track_booking.enabled'])->group(function () {
            Route::get('/track-bookings/availability', [\App\Http\Controllers\TrackReservationController::class, 'availability']);
            Route::get('/track-bookings/my', [\App\Http\Controllers\TrackReservationController::class, 'myReservations']);
            Route::post('/track-bookings', [\App\Http\Controllers\TrackReservationController::class, 'store']);
            Route::post('/track-bookings/{id}/delete', [\App\Http\Controllers\TrackReservationController::class, 'destroy']);
        });

        Route::get('/reservations/my', [ReservationController::class, 'myReservations']); // Necesitaríamos este endpoint
        Route::post('/reservations', [ReservationController::class, 'store']); // ???
        Route::post('/reservations/block/delete', [ReservationController::class, 'destroyBlock']); // ???
        Route::get('/reservations/{id}', [ReservationController::class, 'show']);
        Route::post('/reservations/{id}', [ReservationController::class, 'update']); // Solo su propia reserva
        Route::post('/reservations/{id}/delete', [ReservationController::class, 'destroy']); // Solo su propia reserva

        // Suggestions
        Route::post('/suggestions', [SuggestionController::class, 'store']);

        Route::get('/videos/upload-config', [VideoController::class, 'uploadConfig']);
        Route::get('/videos', [VideoController::class, 'index']);
        Route::post('/videos', [VideoController::class, 'store']);
        Route::post('/videos/{id}/uploaded', [VideoController::class, 'uploaded']);
        Route::post('/videos/{id}', [VideoController::class, 'update']);
        Route::post('/videos/{id}/delete', [VideoController::class, 'destroy']);
        Route::post('/videos/{id}/toggle-like', [VideoController::class, 'toggleLike']);
        Route::get('/videos/{id}/download', [VideoController::class, 'download']);

        // Galería de Fotos interna
        Route::get('/photos', [PhotoController::class, 'index']);
        Route::get('/photos/storage-stats', [PhotoController::class, 'storageStats']);
        Route::get('/photos/{id}/download', [PhotoController::class, 'download']);
        Route::post('/photos', [PhotoController::class, 'store']);
        Route::post('/photos/{id}', [PhotoController::class, 'update']);
        Route::post('/photos/{id}/delete', [PhotoController::class, 'destroy']);
        Route::post('/photos/{id}/untag-self', [PhotoController::class, 'untagSelf']);

        // Event Attendance
        Route::post('/competitions/{id}/attend', [CompetitionController::class, 'attend']);
        Route::post('/competitions/{id}/unattend', [CompetitionController::class, 'unattend']);
        Route::get('/competitions/{id}/attendees', [CompetitionController::class, 'getAttendees']);

        // Personal Events
        Route::get('/personal-events', [PersonalEventController::class, 'index']);
        Route::post('/personal-events', [PersonalEventController::class, 'store']);
        Route::put('/personal-events/{id}', [PersonalEventController::class, 'update']);
        Route::delete('/personal-events/{id}', [PersonalEventController::class, 'destroy']);

        // Scraper Tracks for members
        Route::get('/scraper/last-tracks', [CompetitionController::class, 'memberScraperLastTracks']);

        Route::middleware(['liga_norte.enabled'])->group(function () {
            // Liga Norte Public Standings
            Route::get('/liga-norte/standings', [LigaNorteController::class, 'getStandings']);
        });

        // Provisión de Fondos (Finanzas)
        Route::middleware(['provision_fondos.enabled'])->group(function () {
            Route::get('/fund-transactions', [\App\Http\Controllers\FundTransactionController::class, 'index']);
            
            Route::middleware(['role:admin,manager'])->group(function () {
                Route::get('/fund-transactions/dashboard', [\App\Http\Controllers\FundTransactionController::class, 'dashboard']);
                Route::post('/fund-transactions', [\App\Http\Controllers\FundTransactionController::class, 'store']);
                Route::post('/fund-transactions/{id}/delete', [\App\Http\Controllers\FundTransactionController::class, 'destroy']);
            });
        });

        Route::middleware(['gamification.enabled'])->group(function () {
            // Ranking
            Route::get('/ranking', [RankingController::class, 'index']);
            Route::get('/seasons', [\App\Http\Controllers\SeasonController::class, 'index']);

            // Sticker Album & Trades Routes
            Route::get('/album', [\App\Http\Controllers\StickerAlbumController::class, 'getAlbum']);
            Route::post('/album/open-chest', [\App\Http\Controllers\StickerAlbumController::class, 'openChest']);
            Route::post('/album/buy-pack', [\App\Http\Controllers\StickerAlbumController::class, 'buyStickerPack']);
            Route::post('/album/claim-promotion', [\App\Http\Controllers\StickerAlbumController::class, 'claimPromotionReward']);

            Route::get('/trades', [\App\Http\Controllers\StickerTradeController::class, 'index']);
            Route::post('/trades', [\App\Http\Controllers\StickerTradeController::class, 'store']);
            Route::post('/trades/{id}/accept', [\App\Http\Controllers\StickerTradeController::class, 'accept']);
            Route::post('/trades/{id}/reject', [\App\Http\Controllers\StickerTradeController::class, 'reject']);
            Route::post('/trades/{id}/cancel', [\App\Http\Controllers\StickerTradeController::class, 'cancel']);

            // Bounty Board (Cazarrecompensas) Routes
            Route::get('/bounty/posters', [BountyController::class, 'getPosters']);
            Route::post('/bounty/contracts', [BountyController::class, 'buyContract']);
            Route::get('/bounty/my-contracts', [BountyController::class, 'getMyContracts']);
            Route::post('/bounty/contracts/{id}/confirm', [BountyController::class, 'confirmCaza']);
            Route::post('/bounty/contracts/{id}/validate', [BountyController::class, 'validateCaza']);
            Route::post('/bounty/contracts/{id}/reroll', [BountyController::class, 'reroll']);
            Route::get('/bounty/feed', [BountyController::class, 'getFeed']);
            Route::post('/bounty/settings', [BountyController::class, 'updateSettings']);
            Route::post('/admin/bounty/toggle', [BountyController::class, 'toggleBountyBoard']);
        });
    });

    });

});
