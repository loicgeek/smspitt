<?php

namespace NtechServices\SmsPitt;

use Illuminate\Support\ServiceProvider;

class SmsPittServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/smspitt.php', 'smspitt');
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/smspitt.php' => config_path('smspitt.php'),
            ], 'smspitt-config');
        }
    }
}
