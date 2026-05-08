<?php

return [
    /*
     * Base URL of the SMSPit mock server (port 2876 for sending SMS).
     * Override via SMSPITT_URL in .env.testing / .env.local.
     */
    'url' => env('SMSPITT_URL', 'http://localhost:2876'),

    /*
     * Base URL for the Test API (port 2877 for assertions).
     */
    'api_url' => env('SMSPITT_API_URL', 'http://localhost:2877'),

    /*
     * Default sender ID / phone number.
     */
    'default_from' => env('SMS_FROM', ''),
];
