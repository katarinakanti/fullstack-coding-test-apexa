<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('structure_id')->constrained()->onDelete('cascade');
            $table->string('label'); // This is the missing column
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->timestamps();

            // Self-referencing foreign key constraint
            $table->foreign('parent_id')->references('id')->on('nodes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nodes');
    }
};
