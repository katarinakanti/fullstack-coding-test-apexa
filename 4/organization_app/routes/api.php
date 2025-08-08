<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StructureController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (require a valid JWT token)
Route::group([
    'middleware' => 'api',
    'prefix' => 'auth'
], function ($router) {
    Route::post('me', [AuthController::class, 'me']);
});

Route::middleware('auth:api')->group(function () {
    Route::get('/structures', [StructureController::class, 'index']);
    Route::get('/structures/{id}', [StructureController::class, 'show']);
    Route::post('/structures', [StructureController::class, 'store']);
    Route::put('/structures/{id}', [StructureController::class, 'update']);
    Route::delete('/structures/{id}', [StructureController::class, 'destroy']);
});

// A new route to serve the API documentation JSON file
Route::get('/docs/api-docs.json', function () {
    $path = base_path('docs/api-docs.json');
    if (file_exists($path)) {
        return response()->file($path);
    }

    return response()->json(['error' => 'API documentation file not found.'], 404);
});